import { Avatar, Box, Button, Drawer, DrawerBody, DrawerContent, DrawerOverlay, HStack, IconButton, Text, useDisclosure, VStack } from "@chakra-ui/react";
import { Bell, Bot, CalendarDays, FileText, HeartPulse, Home, LogOut, Menu, Settings, Users } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/AuthContext";
import { useNotifications } from "@/api/queries";
import { MobileCard } from "@/components/MobileCard";

const employeeTabs = [
  { to: "/employee/home", label: "Accueil", icon: Home },
  { to: "/employee/vacations", label: "Congés", icon: CalendarDays },
  { to: "/employee/documents", label: "Docs", icon: FileText },
  { to: "/assistant", label: "ARIA", icon: Bot },
];

const managerTabs = [
  { to: "/manager/home", label: "Accueil", icon: Home },
  { to: "/manager/team", label: "Équipe", icon: Users },
  { to: "/manager/requests", label: "Demandes", icon: FileText },
  { to: "/manager/qvt", label: "QVT", icon: HeartPulse },
];

export function MobileLayout() {
  const { user, shell, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const drawer = useDisclosure();
  const notifications = useNotifications(user?.userId);
  const unread = notifications.data?.filter((item) => !item.readAt).length ?? 0;
  const tabs = shell === "manager" ? managerTabs : employeeTabs;

  return (
    <Box minH="100vh" bg="app.bg" pb="92px">
      <Box position="sticky" top={0} zIndex={10} bg="rgba(244,247,251,.84)" backdropFilter="blur(14px)" px={4} py={3}>
        <HStack justify="space-between">
          <HStack>
            <Avatar name={user?.fullName} size="sm" bg="brand.500" color="white" />
            <Box>
              <Text fontWeight="900" lineHeight={1}>{user?.fullName?.split(" ")[0] ?? "Intelli"}</Text>
              <Text fontSize="xs" color="gray.500">{shell === "manager" ? "Manager" : "Collaborateur"}</Text>
            </Box>
          </HStack>
          <HStack>
            <IconButton aria-label="Notifications" variant="ghost" icon={<Bell size={19} />} onClick={() => navigate("/notifications")} />
            {unread ? <Text fontSize="xs" bg="red.400" color="white" px={2} borderRadius="full" ml="-16px" mt="-22px">{unread}</Text> : null}
            <IconButton aria-label="Menu" variant="ghost" icon={<Menu size={21} />} onClick={drawer.onOpen} />
          </HStack>
        </HStack>
      </Box>

      <Box px={4} py={3}>
        <Outlet />
      </Box>

      <HStack position="fixed" left={3} right={3} bottom={3} zIndex={20} bg="white" borderRadius="28px" boxShadow="0 18px 45px rgba(112,144,176,.24)" borderWidth="1px" borderColor="app.border" justify="space-around" p={2}>
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || (to !== "/assistant" && location.pathname.startsWith(to));
          return (
            <Button as={NavLink} to={to} key={to} variant={active ? "solid" : "ghost"} colorScheme={active ? "brand" : "gray"} size="sm" flex="1" leftIcon={<Icon size={17} />} px={2}>
              <Text display={{ base: "none", sm: "inline" }}>{label}</Text>
            </Button>
          );
        })}
      </HStack>

      <Drawer isOpen={drawer.isOpen} onClose={drawer.onClose} placement="right">
        <DrawerOverlay />
        <DrawerContent borderLeftRadius="24px">
          <DrawerBody p={4}>
            <VStack align="stretch" spacing={3} mt={6}>
              <MobileCard>
                <Text fontWeight="900">{user?.fullName}</Text>
                <Text fontSize="sm" color="gray.500">{user?.email}</Text>
              </MobileCard>
              <Button leftIcon={<Settings size={18} />} variant="ghost" justifyContent="flex-start" onClick={() => { drawer.onClose(); navigate("/settings"); }}>Paramètres</Button>
              <Button leftIcon={<Bot size={18} />} variant="ghost" justifyContent="flex-start" onClick={() => { drawer.onClose(); navigate("/assistant"); }}>Ouvrir ARIA</Button>
              {shell === "manager" ? <Button leftIcon={<CalendarDays size={18} />} variant="ghost" justifyContent="flex-start" onClick={() => { drawer.onClose(); navigate("/manager/vacations"); }}>Mes congés</Button> : null}
              <Button leftIcon={<FileText size={18} />} variant="ghost" justifyContent="flex-start" onClick={() => { drawer.onClose(); navigate(shell === "manager" ? "/manager/request-document" : "/employee/request-document"); }}>Demande document</Button>
              {shell === "employee" ? <Button leftIcon={<Users size={18} />} variant="ghost" justifyContent="flex-start" onClick={() => { drawer.onClose(); navigate("/employee/onboarding"); }}>Onboarding</Button> : null}
              <Button colorScheme="red" variant="ghost" justifyContent="flex-start" leftIcon={<LogOut size={18} />} onClick={() => void logout().then(() => navigate("/login"))}>Déconnexion</Button>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
