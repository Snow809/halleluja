import { Avatar, Button, Stack, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/AuthContext";
import { MobileCard } from "@/components/MobileCard";
import { SectionHeader } from "@/components/SectionHeader";

export function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <Stack spacing={5}>
      <SectionHeader title="Paramètres" subtitle="Compte mobile." />
      <MobileCard>
        <Stack align="center">
          <Avatar name={user?.fullName} bg="brand.500" color="white" size="lg" />
          <Text fontWeight="900">{user?.fullName}</Text>
          <Text color="gray.500" fontSize="sm">{user?.email}</Text>
        </Stack>
      </MobileCard>
      <MobileCard>
        <Text fontWeight="900">Version PWA</Text>
        <Text color="gray.500" fontSize="sm">Core mobile v1 · pas de mutation hors ligne.</Text>
      </MobileCard>
      <Button colorScheme="red" variant="outline" onClick={() => void logout().then(() => navigate("/login"))}>Déconnexion</Button>
    </Stack>
  );
}
