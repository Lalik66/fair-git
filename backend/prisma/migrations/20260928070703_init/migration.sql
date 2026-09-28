-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "google_id" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "preferred_language" TEXT NOT NULL DEFAULT 'az',
    "password_hash" TEXT,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "last_login" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_latitude" DOUBLE PRECISION,
    "last_longitude" DOUBLE PRECISION,
    "location_updated_at" TIMESTAMP(3),
    "is_sharing_location" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_incidents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "audio_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "resolution_note" TEXT,
    "resolved_by_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sos_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_pins" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsor_banners" (
    "id" TEXT NOT NULL,
    "fair_id" TEXT,
    "image_url" TEXT NOT NULL,
    "link_url" TEXT,
    "alt_text" TEXT,
    "placement" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsor_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banner_impressions" (
    "id" TEXT NOT NULL,
    "banner_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banner_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_name" TEXT,
    "business_description" TEXT,
    "logo_url" TEXT,
    "product_category" TEXT,
    "avg_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_product_images" (
    "id" TEXT NOT NULL,
    "vendor_profile_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fairs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description_az" TEXT,
    "description_en" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "location_address" TEXT,
    "map_center_lat" DOUBLE PRECISION,
    "map_center_lng" DOUBLE PRECISION,
    "banner_image_url" TEXT,
    "gallery_urls" TEXT,
    "archive_video_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "fairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "map_zones" (
    "id" TEXT NOT NULL,
    "fair_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "opacity" DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    "description_az" TEXT,
    "description_en" TEXT,
    "geometry" TEXT NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "map_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fair_events" (
    "id" TEXT NOT NULL,
    "fair_id" TEXT NOT NULL,
    "name_az" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "description_az" TEXT,
    "description_en" TEXT,
    "category" TEXT NOT NULL,
    "emoji" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "location_type" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fair_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_houses" (
    "id" TEXT NOT NULL,
    "house_number" TEXT NOT NULL,
    "area_sqm" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "description" TEXT,
    "visitor_story" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "panorama_360_url" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_houses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_clicks" (
    "id" TEXT NOT NULL,
    "vendor_house_id" TEXT NOT NULL,
    "user_id" TEXT,
    "event_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "photo_url" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "vendor_profile_id" TEXT NOT NULL,
    "fair_id" TEXT NOT NULL,
    "vendor_house_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "admin_notes" TEXT,
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "patronymic" TEXT,
    "applicant_email" TEXT,
    "applicant_phone" TEXT,
    "id_series" TEXT,
    "id_number" TEXT,
    "financial_id" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "country" TEXT,
    "city" TEXT,
    "rules_accepted" BOOLEAN NOT NULL DEFAULT false,
    "payment_accepted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "vendor_profile_id" TEXT NOT NULL,
    "vendor_house_id" TEXT NOT NULL,
    "fair_id" TEXT NOT NULL,
    "booking_status" TEXT NOT NULL DEFAULT 'pending',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ip_address" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "about_us_content" (
    "id" TEXT NOT NULL,
    "section_key" TEXT NOT NULL,
    "content_az" TEXT,
    "content_en" TEXT,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "about_us_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_contact_info" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "facebook_url" TEXT,
    "instagram_url" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_contact_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "participant_1" TEXT NOT NULL,
    "participant_2" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reactions" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seen_at" TIMESTAMP(3),

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_feedback" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "rating" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "categories" TEXT,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "vendor_reply" TEXT,
    "replied_at" TIMESTAMP(3),
    "report_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "moderated_at" TIMESTAMP(3),
    "moderated_by_id" TEXT,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_leads" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "consent_accepted" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'popup',
    "preferred_language" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "sos_incidents_status_created_at_idx" ON "sos_incidents"("status", "created_at");

-- CreateIndex
CREATE INDEX "user_pins_user_id_idx" ON "user_pins"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_pins_user_id_label_key" ON "user_pins"("user_id", "label");

-- CreateIndex
CREATE INDEX "sponsor_banners_placement_is_active_starts_at_ends_at_idx" ON "sponsor_banners"("placement", "is_active", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "sponsor_banners_fair_id_idx" ON "sponsor_banners"("fair_id");

-- CreateIndex
CREATE INDEX "banner_impressions_banner_id_created_at_idx" ON "banner_impressions"("banner_id", "created_at");

-- CreateIndex
CREATE INDEX "banner_impressions_event_type_created_at_idx" ON "banner_impressions"("event_type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_profiles_user_id_key" ON "vendor_profiles"("user_id");

-- CreateIndex
CREATE INDEX "fairs_status_idx" ON "fairs"("status");

-- CreateIndex
CREATE INDEX "fairs_status_start_date_idx" ON "fairs"("status", "start_date");

-- CreateIndex
CREATE INDEX "map_zones_fair_id_is_visible_idx" ON "map_zones"("fair_id", "is_visible");

-- CreateIndex
CREATE INDEX "fair_events_fair_id_start_time_idx" ON "fair_events"("fair_id", "start_time");

-- CreateIndex
CREATE INDEX "fair_events_fair_id_end_time_idx" ON "fair_events"("fair_id", "end_time");

-- CreateIndex
CREATE INDEX "fair_events_location_type_location_id_idx" ON "fair_events"("location_type", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_houses_house_number_key" ON "vendor_houses"("house_number");

-- CreateIndex
CREATE INDEX "vendor_houses_is_enabled_idx" ON "vendor_houses"("is_enabled");

-- CreateIndex
CREATE INDEX "vendor_clicks_vendor_house_id_created_at_idx" ON "vendor_clicks"("vendor_house_id", "created_at");

-- CreateIndex
CREATE INDEX "vendor_clicks_created_at_idx" ON "vendor_clicks"("created_at");

-- CreateIndex
CREATE INDEX "vendor_clicks_event_type_created_at_idx" ON "vendor_clicks"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "facilities_type_idx" ON "facilities"("type");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE INDEX "applications_fair_id_status_idx" ON "applications"("fair_id", "status");

-- CreateIndex
CREATE INDEX "applications_vendor_profile_id_submitted_at_idx" ON "applications"("vendor_profile_id", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_application_id_key" ON "bookings"("application_id");

-- CreateIndex
CREATE INDEX "bookings_fair_id_booking_status_is_archived_idx" ON "bookings"("fair_id", "booking_status", "is_archived");

-- CreateIndex
CREATE INDEX "bookings_vendor_house_id_idx" ON "bookings"("vendor_house_id");

-- CreateIndex
CREATE INDEX "admin_logs_timestamp_idx" ON "admin_logs"("timestamp");

-- CreateIndex
CREATE INDEX "admin_logs_action_timestamp_idx" ON "admin_logs"("action", "timestamp");

-- CreateIndex
CREATE INDEX "admin_logs_admin_id_idx" ON "admin_logs"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "about_us_content_section_key_key" ON "about_us_content"("section_key");

-- CreateIndex
CREATE INDEX "user_follows_follower_id_idx" ON "user_follows"("follower_id");

-- CreateIndex
CREATE INDEX "user_follows_following_id_idx" ON "user_follows"("following_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_follows_follower_id_following_id_key" ON "user_follows"("follower_id", "following_id");

-- CreateIndex
CREATE INDEX "conversations_participant_1_idx" ON "conversations"("participant_1");

-- CreateIndex
CREATE INDEX "conversations_participant_2_idx" ON "conversations"("participant_2");

-- CreateIndex
CREATE INDEX "conversations_updated_at_idx" ON "conversations"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_participant_1_participant_2_key" ON "conversations"("participant_1", "participant_2");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "messages_conversation_id_sender_id_read_at_idx" ON "messages"("conversation_id", "sender_id", "read_at");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE UNIQUE INDEX "invite_links_token_key" ON "invite_links"("token");

-- CreateIndex
CREATE INDEX "invite_links_token_idx" ON "invite_links"("token");

-- CreateIndex
CREATE INDEX "invite_links_created_by_id_idx" ON "invite_links"("created_by_id");

-- CreateIndex
CREATE INDEX "reactions_recipient_id_created_at_idx" ON "reactions"("recipient_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reactions_recipient_id_seen_at_idx" ON "reactions"("recipient_id", "seen_at");

-- CreateIndex
CREATE INDEX "reactions_sender_id_idx" ON "reactions"("sender_id");

-- CreateIndex
CREATE INDEX "site_feedback_is_read_created_at_idx" ON "site_feedback"("is_read", "created_at");

-- CreateIndex
CREATE INDEX "reviews_vendor_id_status_idx" ON "reviews"("vendor_id", "status");

-- CreateIndex
CREATE INDEX "reviews_status_created_at_idx" ON "reviews"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_vendor_id_visitor_id_key" ON "reviews"("vendor_id", "visitor_id");

-- CreateIndex
CREATE INDEX "marketing_leads_created_at_idx" ON "marketing_leads"("created_at");

-- AddForeignKey
ALTER TABLE "sos_incidents" ADD CONSTRAINT "sos_incidents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_incidents" ADD CONSTRAINT "sos_incidents_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_pins" ADD CONSTRAINT "user_pins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banner_impressions" ADD CONSTRAINT "banner_impressions_banner_id_fkey" FOREIGN KEY ("banner_id") REFERENCES "sponsor_banners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_profiles" ADD CONSTRAINT "vendor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_product_images" ADD CONSTRAINT "vendor_product_images_vendor_profile_id_fkey" FOREIGN KEY ("vendor_profile_id") REFERENCES "vendor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_zones" ADD CONSTRAINT "map_zones_fair_id_fkey" FOREIGN KEY ("fair_id") REFERENCES "fairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_events" ADD CONSTRAINT "fair_events_fair_id_fkey" FOREIGN KEY ("fair_id") REFERENCES "fairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_clicks" ADD CONSTRAINT "vendor_clicks_vendor_house_id_fkey" FOREIGN KEY ("vendor_house_id") REFERENCES "vendor_houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_vendor_profile_id_fkey" FOREIGN KEY ("vendor_profile_id") REFERENCES "vendor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_fair_id_fkey" FOREIGN KEY ("fair_id") REFERENCES "fairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_vendor_house_id_fkey" FOREIGN KEY ("vendor_house_id") REFERENCES "vendor_houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vendor_profile_id_fkey" FOREIGN KEY ("vendor_profile_id") REFERENCES "vendor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vendor_house_id_fkey" FOREIGN KEY ("vendor_house_id") REFERENCES "vendor_houses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_fair_id_fkey" FOREIGN KEY ("fair_id") REFERENCES "fairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "about_us_content" ADD CONSTRAINT "about_us_content_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_1_fkey" FOREIGN KEY ("participant_1") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_2_fkey" FOREIGN KEY ("participant_2") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_id_fkey" FOREIGN KEY ("moderated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
