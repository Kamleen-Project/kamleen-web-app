-- Create join table for saved experiences
CREATE TABLE "UserSavedExperience" (
    "userId" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    CONSTRAINT "UserSavedExperience_pkey" PRIMARY KEY ("userId", "experienceId"),
    CONSTRAINT "UserSavedExperience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserSavedExperience_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "public"."Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "UserSavedExperience_user_idx" ON "UserSavedExperience"("userId");
CREATE INDEX "UserSavedExperience_experience_idx" ON "UserSavedExperience"("experienceId");

