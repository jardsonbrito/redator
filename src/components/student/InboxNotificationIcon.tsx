import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStudentInbox } from "@/hooks/useStudentInbox";
import { StudentInboxModal } from "./StudentInboxModal";

export function InboxNotificationIcon() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { unreadCount, isLoading } = useStudentInbox();

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className="relative">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="relative hover:bg-white/20 text-white"
      >
        <Bell className="h-5 w-5 text-white" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      <StudentInboxModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}