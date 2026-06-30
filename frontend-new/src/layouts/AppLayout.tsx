import { lazy, Suspense } from "react";
import { Box, Drawer, DrawerBody, DrawerContent, DrawerOverlay, useDisclosure } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import { MainPanel, PanelContainer, PanelContent } from "@/purity";
import { drawerWidth } from "@/theme/theme";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Navbar } from "@/components/navigation/Navbar";
import { NotificationsPanel } from "@/features/shared/NotificationsPanel";
import { AllNotifications } from "@/features/shared/AllNotifications";

const MiniAIAssistant = lazy(() => import("@/features/shared/MiniAIAssistant").then((module) => ({ default: module.MiniAIAssistant })));

export function AppLayout() {
  const sidebar = useDisclosure();
  const notifications = useDisclosure();
  const allNotifications = useDisclosure();
  const miniAi = useDisclosure();

  return (
    <Box minH="100vh" bg="app.bg">
      <Box
        display={{ base: "none", lg: "block" }}
        position="fixed"
        top="24px"
        bottom="24px"
        left="20px"
        w={`${drawerWidth}px`}
        zIndex={30}
      >
        <Sidebar />
      </Box>
      <Drawer isOpen={sidebar.isOpen} onClose={sidebar.onClose} placement="left">
        <DrawerOverlay />
        <DrawerContent maxW={`${drawerWidth}px`}>
          <DrawerBody p={0}><Sidebar onNavigate={sidebar.onClose} /></DrawerBody>
        </DrawerContent>
      </Drawer>
      <MainPanel
        ml={{ base: 0, lg: `${drawerWidth + 32}px` }}
        w={{ base: "100%", lg: `calc(100% - ${drawerWidth + 32}px)` }}
      >
        <Navbar onOpenSidebar={sidebar.onOpen} onOpenNotifications={notifications.onToggle} onOpenMiniAi={miniAi.onOpen} />
        {notifications.isOpen ? <NotificationsPanel onClose={notifications.onClose} onShowAll={allNotifications.onOpen} /> : null}
        <PanelContainer>
          <PanelContent>
            <Outlet />
          </PanelContent>
        </PanelContainer>
      </MainPanel>
      {miniAi.isOpen ? (
        <Suspense fallback={null}>
          <MiniAIAssistant onClose={miniAi.onClose} />
        </Suspense>
      ) : null}
      <AllNotifications isOpen={allNotifications.isOpen} onClose={allNotifications.onClose} />
    </Box>
  );
}
