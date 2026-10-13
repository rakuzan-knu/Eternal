Synthetic 120-second, 440 Hz sine wave, AAC 32 kbit/s, HLS MPEG-TS segments.
Generated locally with FFmpeg via a disposable container; contains no user media.
Served exclusively by Playwright routes, never included in the production assets.
The `.mpegts` extension prevents TypeScript from parsing binary transport streams.

Generation arguments: `-f lavfi -i sine=frequency=440:sample_rate=44100 -t 120 -c:a aac -b:a 32k -vn -f hls -hls_time 10 -hls_list_size 0 -hls_segment_filename segment-%02d.mpegts playlist.m3u8`.
