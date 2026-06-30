import { Box, Flex, Text } from "@chakra-ui/react";
import { useLocation } from "react-router-dom";
import { AdminNavbar, AdminNavbarLinks } from "@/purity";
import { useAuth } from "@/app/AuthContext";
import { useNotifications } from "@/api/queries";
import { shellLabel, sidebarByShell } from "./sidebarConfig";

export function Navbar({ onOpenSidebar, onOpenNotifications, onOpenMiniAi }: { onOpenSidebar(): void; onOpenNotifications(): void; onOpenMiniAi(): void }) {
  const { user, shell } = useAuth();
  const location = useLocation();
  const notifications = useNotifications(user?.userId);
  const unread = notifications.data?.filter((item) => !item.readAt).length ?? 0;
  const current = shell ? sidebarByShell[shell].find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)) : null;

  return (
    <AdminNavbar>
      <Flex w="100%" flexDirection={{ base: "column", md: "row" }} alignItems={{ xl: "center" }}>
        <Box mb={{ base: "8px", md: "0px" }}>
          <Text color="gray.400" fontSize="xs" fontWeight="700">
            Pages / {shellLabel(shell)}
          </Text>
          <Text color="gray.700" fontWeight="bold" fontSize="sm">
            {current?.label ?? "Dashboard"}
          </Text>
        </Box>
        <Box ms="auto" w={{ base: "100%", md: "unset" }}>
          <AdminNavbarLinks
            user={user}
            unread={unread}
            onOpenSidebar={onOpenSidebar}
            onOpenNotifications={onOpenNotifications}
            onOpenMiniAi={onOpenMiniAi}
          />
        </Box>
      </Flex>
    </AdminNavbar>
  );
}
