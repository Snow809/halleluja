import React from "react";
import { Avatar, Badge, Box, Button, Flex, HStack, Icon, Stack, Text } from "@chakra-ui/react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Sparkles } from "lucide-react";
import { Separator, SidebarHelp } from "@/purity";
import { useAuth } from "@/app/AuthContext";
import { shellLabel, sidebarByShell, type SidebarEntry } from "./sidebarConfig";

function initials(name?: string) {
  return (name ?? "IT").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function SidebarLink({ item, active, onClick }: { item: SidebarEntry; active: boolean; onClick?: () => void }) {
  return (
    <Button
      as={RouterLink}
      to={item.to}
      onClick={onClick}
      justifyContent="flex-start"
      w="100%"
      h="44px"
      variant="ghost"
      borderRadius="15px"
      bg={active ? "white" : "transparent"}
      color={active ? "gray.800" : "gray.500"}
      fontWeight={active ? "800" : "700"}
      boxShadow={active ? "0px 7px 11px rgba(0, 0, 0, 0.04)" : "none"}
      _hover={{ bg: "white", color: "gray.800", boxShadow: "0px 7px 11px rgba(0, 0, 0, 0.04)" }}
      leftIcon={
        <Flex
          align="center"
          justify="center"
          w="30px"
          h="30px"
          borderRadius="12px"
          bg={active ? "brand.500" : "white"}
          color={active ? "white" : "brand.500"}
          boxShadow="0px 3.5px 5.5px rgba(0, 0, 0, 0.02)"
        >
          <Icon as={item.icon} boxSize={4} />
        </Flex>
      }
    >
      {item.label}
    </Button>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, shell, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const entries = shell ? sidebarByShell[shell] : [];
  let lastGroup = "";

  return (
    <Flex h="100%" direction="column" bg="white" borderRadius="20px" boxShadow="0px 5px 14px rgba(0, 0, 0, 0.05)" overflow="hidden">
      <HStack h="78px" px={6} spacing={3}>
        <Flex w="38px" h="38px" align="center" justify="center" borderRadius="12px" bg="brand.500" color="white">
          <Sparkles size={20} />
        </Flex>
        <Box>
          <HStack spacing={2}>
            <Text fontWeight="900" color="gray.800" fontSize="lg">Intelli-Talent</Text>
            <Badge colorScheme="blue" borderRadius="full">PRO</Badge>
          </HStack>
          <Text fontSize="xs" color="gray.500" fontWeight="700">{shellLabel(shell)}</Text>
        </Box>
      </HStack>
      <Box px={6}><Separator /></Box>
      <Stack flex="1" px={4} py={4} spacing={1} overflowY="auto">
        {entries.map((item) => {
          const showGroup = item.group && item.group !== lastGroup;
          if (item.group) lastGroup = item.group;
          return (
            <React.Fragment key={item.to}>
              {showGroup ? <Text pt={4} pb={1} px={3} fontSize="11px" fontWeight="900" color="gray.400" textTransform="uppercase">{item.group}</Text> : null}
              <SidebarLink item={item} active={location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)} onClick={onNavigate} />
            </React.Fragment>
          );
        })}
      </Stack>
      <Box p={4}>
        <Box mb={4}>
          <SidebarHelp />
        </Box>
        <HStack mb={4} spacing={3} p={3} bg="gray.50" borderRadius="16px">
          <Avatar name={user?.fullName} bg="brand.500" color="white" size="sm">{initials(user?.fullName)}</Avatar>
          <Box minW={0}>
            <Text fontWeight="800" noOfLines={1}>{user?.fullName}</Text>
            <Text fontSize="xs" color="gray.500" noOfLines={1}>{user?.email}</Text>
          </Box>
        </HStack>
        <Button
          w="100%"
          variant="ghost"
          colorScheme="red"
          justifyContent="flex-start"
          leftIcon={<LogOut size={18} />}
          onClick={async () => {
            await logout();
            navigate("/login", { replace: true });
          }}
        >
          Déconnexion
        </Button>
      </Box>
    </Flex>
  );
}
