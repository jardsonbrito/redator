import React, { useState } from "react";
import { useStudentInbox } from "@/hooks/useStudentInbox";
import { useStudentAuth } from "@/hooks/useStudentAuth";
import { StudentInboxModal } from "./StudentInboxModal";
import { BlockingMessageModal } from "./BlockingMessageModal";
import { FriendlyMessageToast } from "./FriendlyMessageToast";

export function StudentInboxManager() {
  const { user } = useStudentAuth();
  const { messages, blockingMessage, hasBlockingMessage, isLoading, error, markAsRead } = useStudentInbox();
  const [showBlockingModal, setShowBlockingModal] = useState(false);
  const [dismissedFriendlyMessages, setDismissedFriendlyMessages] = useState<Set<string>>(new Set());


  // Mostrar modal bloqueante automaticamente se houver mensagem bloqueante pendente
  React.useEffect(() => {
    if (hasBlockingMessage && blockingMessage) {
      setShowBlockingModal(true);
    }
  }, [hasBlockingMessage, blockingMessage]);

  // Buscar mensagens amigáveis não lidas que não foram descartadas
  const friendlyMessages = messages.filter(msg =>
    msg.type === 'amigavel' &&
    msg.status === 'pendente' &&
    !dismissedFriendlyMessages.has(msg.id)
  );


  const handleDismissFriendlyMessage = (messageId: string) => {
    setDismissedFriendlyMessages(prev => new Set([...prev, messageId]));
    // Marcar como lida no banco
    const message = messages.find(msg => msg.id === messageId);
    if (message) {
      markAsRead(message.id);
    }
  };

  return (
    <>
      {/* Modal bloqueante */}
      {showBlockingModal && blockingMessage && (
        <BlockingMessageModal
          message={blockingMessage}
          isOpen={showBlockingModal}
          onClose={() => setShowBlockingModal(false)}
        />
      )}

      {/* Toasts para mensagens amigáveis */}
      {friendlyMessages.map(message => (
        <FriendlyMessageToast
          key={message.id}
          message={message}
          onDismiss={() => handleDismissFriendlyMessage(message.id)}
        />
      ))}
    </>
  );
}