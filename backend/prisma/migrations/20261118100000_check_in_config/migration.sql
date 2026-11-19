CREATE TABLE "CheckInConfig" (
    "id"        SERIAL NOT NULL,
    "day1"      INTEGER NOT NULL DEFAULT 20,
    "day2"      INTEGER NOT NULL DEFAULT 20,
    "day3"      INTEGER NOT NULL DEFAULT 20,
    "day4"      INTEGER NOT NULL DEFAULT 20,
    "day5"      INTEGER NOT NULL DEFAULT 20,
    "day6"      INTEGER NOT NULL DEFAULT 20,
    "day7"      INTEGER NOT NULL DEFAULT 60,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckInConfig_pkey" PRIMARY KEY ("id")
);
