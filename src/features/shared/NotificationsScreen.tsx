"use client";
import { PageHeader } from "@/components/ui";
import { NotificationsList } from "./NotificationsView";

export default function NotificationsScreen() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Notifications" subtitle="Updates grouped by day. Tap one to jump to the right place." />
      <NotificationsList />
    </div>
  );
}
