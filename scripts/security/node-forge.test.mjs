import assert from 'node:assert/strict';
import {
  constants,
  createHash,
  generateKeyPairSync,
  privateEncrypt,
  sign,
  verify,
} from 'node:crypto';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

// Resolve the actual transitive implementation used by Expo, not a test-only copy.
const mobileRequire = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const expoRequire = createRequire(mobileRequire.resolve('expo/package.json'));
const cliRequire = createRequire(expoRequire.resolve('@expo/cli/package.json'));
const forge = cliRequire('node-forge');
const certificates = cliRequire('@expo/code-signing-certificates');
const certificatesRequire = createRequire(cliRequire.resolve('@expo/code-signing-certificates'));
const message = Buffer.from('Eternal RSA verifier regression');

function der(tag, ...parts) {
  const content = Buffer.concat(parts);
  assert.ok(content.length < 256, 'Test fixture exceeds its DER length encoder');
  const length = content.length < 128 ? [content.length] : [0x81, content.length];
  return Buffer.concat([Buffer.from([tag, ...length]), content]);
}

const oid = Buffer.from('0609608648016503040201', 'hex');
const emptyNull = Buffer.from('0500', 'hex');
const digest = createHash('sha256').update(message).digest();
const octets = der(0x04, digest);
const algorithm = der(0x30, oid, emptyNull);
const canonical = der(0x30, algorithm, octets);

// These fixtures use private-key-generated malformed encodings to exercise the
// verifier. They reproduce acceptance of attacker-controlled slack, rather than
// claiming to demonstrate a private-key-free signature forgery.
const malformed = [
  [
    'extra inner element',
    der(0x30, der(0x30, oid, emptyNull, der(0x02, Buffer.alloc(32, 0x88))), octets),
  ],
  ['non-NULL second element', der(0x30, der(0x30, oid, der(0x04, Buffer.alloc(32, 0x88))), octets)],
  ['NULL with content', der(0x30, der(0x30, oid, der(0x05, Buffer.alloc(100, 0x88))), octets)],
  [
    'non-minimal outer length',
    Buffer.concat([Buffer.from([0x30, 0x81, canonical[1]]), canonical.subarray(2)]),
  ],
  [
    'non-minimal inner length',
    der(
      0x30,
      Buffer.concat([Buffer.from([0x30, 0x81, algorithm[1]]), algorithm.subarray(2)]),
      octets,
    ),
  ],
  ['extra outer element', der(0x30, algorithm, octets, der(0x02, Buffer.from([1])))],
  ['trailing bytes', Buffer.concat([canonical, Buffer.from([0])])],
];

function paddedSignature(privateKey, modulusBytes, encoded) {
  const paddingLength = modulusBytes - encoded.length - 3;
  assert.ok(paddingLength >= 8, 'Fixture must retain valid PKCS#1 type-1 padding');
  const padded = Buffer.concat([
    Buffer.from([0, 1]),
    Buffer.alloc(paddingLength, 0xff),
    Buffer.from([0]),
    encoded,
  ]);
  return privateEncrypt({ key: privateKey, padding: constants.RSA_NO_PADDING }, padded).toString(
    'latin1',
  );
}

describe('Expo node-forge security backport', () => {
  it('protects both Expo consumers with the same patched package', () => {
    assert.equal(certificatesRequire.resolve('node-forge'), cliRequire.resolve('node-forge'));
    assert.equal(cliRequire('node-forge/package.json').version, '1.4.0');
  });

  it('preserves Expo certificate, CSR and update-manifest signing', () => {
    const pem = certificates.convertKeyPairToPEM(certificates.generateKeyPair());
    const keyPair = certificates.convertKeyPairPEMToKeyPair(pem);
    const generated = certificates.generateSelfSignedCodeSigningCertificate({
      keyPair,
      validityNotBefore: new Date(Date.now() - 60_000),
      validityNotAfter: new Date(Date.now() + 3_600_000),
      commonName: 'Eternal security regression',
    });
    const certificate = certificates.convertCertificatePEMToCertificate(
      certificates.convertCertificateToCertificatePEM(generated),
    );
    assert.doesNotThrow(() => certificates.validateSelfSignedCertificate(certificate, keyPair));
    const signature = certificates.signBufferRSASHA256AndVerify(
      keyPair.privateKey,
      certificate,
      message,
    );
    assert.equal(
      verify('sha256', message, pem.publicKeyPEM, Buffer.from(signature, 'base64')),
      true,
    );
    assert.equal(
      verify('sha256', Buffer.from('tampered'), pem.publicKeyPEM, Buffer.from(signature, 'base64')),
      false,
    );
    const csr = certificates.convertCSRPEMToCSR(
      certificates.convertCSRToCSRPEM(
        certificates.generateCSR(keyPair, 'Eternal security regression'),
      ),
    );
    assert.equal(csr.verify(), true);
  });

  for (const exponent of [3, 65537]) {
    describe(`RSA public exponent ${exponent}`, () => {
      const keys = generateKeyPairSync('rsa', { modulusLength: 2048, publicExponent: exponent });
      const publicKey = forge.pki.publicKeyFromPem(
        keys.publicKey.export({ type: 'spki', format: 'pem' }),
      );

      for (const [name, encoded] of malformed) {
        it(`rejects ${name} with valid padding`, () => {
          const signature = paddedSignature(keys.privateKey, 256, encoded);
          assert.throws(
            () => publicKey.verify(digest.toString('latin1'), signature),
            /DigestInfo|Unparsed DER bytes/,
          );
        });
      }

      for (const [name, encoded] of [
        ['with NULL parameters', canonical],
        ['without NULL parameters', der(0x30, der(0x30, oid), octets)],
      ]) {
        it(`accepts canonical DigestInfo ${name}`, () => {
          const signature = paddedSignature(keys.privateKey, 256, encoded);
          assert.equal(publicKey.verify(digest.toString('latin1'), signature), true);
          assert.equal(publicKey.verify(Buffer.alloc(32).toString('latin1'), signature), false);
        });
      }

      for (const hash of ['sha256', 'sha384', 'sha512']) {
        it(`accepts Node/OpenSSL ${hash} signatures`, () => {
          const signature = sign(hash, message, {
            key: keys.privateKey,
            padding: constants.RSA_PKCS1_PADDING,
          });
          const value = createHash(hash).update(message).digest('latin1');
          assert.equal(publicKey.verify(value, signature.toString('latin1')), true);
        });
      }

      it('preserves RSA-PSS verification', () => {
        const signature = sign('sha256', message, {
          key: keys.privateKey,
          padding: constants.RSA_PKCS1_PSS_PADDING,
          saltLength: 32,
        });
        const scheme = forge.pss.create({
          md: forge.md.sha256.create(),
          mgf: forge.mgf.mgf1.create(forge.md.sha256.create()),
          saltLength: 32,
        });
        assert.equal(
          publicKey.verify(digest.toString('latin1'), signature.toString('latin1'), scheme),
          true,
        );
      });

      it('preserves raw NONE verification', () => {
        const signature = privateEncrypt(
          { key: keys.privateKey, padding: constants.RSA_PKCS1_PADDING },
          message,
        );
        assert.equal(
          publicKey.verify(message.toString('latin1'), signature.toString('latin1'), 'NONE'),
          true,
        );
      });
    });
  }
});
