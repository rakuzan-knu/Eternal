CREATE TABLE "registration_admissions" (
  "user_id" TEXT NOT NULL,
  "country_of_residence" TEXT NOT NULL,
  "terms_version" TEXT NOT NULL,
  "contracting_role" TEXT NOT NULL,
  "guardian_approval_declared" BOOLEAN NOT NULL,
  "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "registration_admissions_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "registration_admissions_country_check" CHECK ("country_of_residence" = 'UA'),
  CONSTRAINT "registration_admissions_role_check" CHECK ("contracting_role" IN ('SELF', 'PARENT_FOR_CHILD')),
  CONSTRAINT "registration_admissions_parent_check" CHECK ("contracting_role" <> 'PARENT_FOR_CHILD' OR "guardian_approval_declared")
);
ALTER TABLE "registration_admissions" ADD CONSTRAINT "registration_admissions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
