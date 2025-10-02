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
      <Button
        variant="outline"
        size="sm"
        disabled
        className="relative border-white/40 text-white bg-white/10 rounded-xl px-3 py-2 shadow-sm backdrop-blur-sm min-w-[2.5rem]"
      >
        <Bell className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="relative flex items-center gap-2 border-white/40 text-white bg-white/10 hover:bg-white/20 hover:border-white/60 rounded-xl px-3 py-2 font-medium transition-all duration-200 shadow-sm backdrop-blur-sm min-w-[2.5rem]"
      >
        <Bell className="w-4 h-4" />
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