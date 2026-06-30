import { Button, Heading, Stack, Text } from "@chakra-ui/react";
import { useAuth } from "@/app/AuthContext";
import { AuthLayout } from "@/layouts/AuthLayout";
import { MobileCard } from "@/components/MobileCard";

export function DesktopRequiredPage() {
  const { logout } = useAuth();
  return (
    <AuthLayout>
      <MobileCard w="100%" p={6}>
        <Stack spacing={4}>
          <Heading size="lg">Espace desktop requis</Heading>
          <Text color="gray.600">
            Les rôles HR, Admin et QVT utilisent encore l’application desktop pour les fonctions complètes.
            Cette PWA v1 couvre les parcours collaborateur et manager.
          </Text>
          <Button as="a" href="http://localhost:5173" target="_blank" rel="noreferrer">Ouvrir le desktop</Button>
          <Button variant="outline" onClick={() => void logout()}>Se déconnecter</Button>
        </Stack>
      </MobileCard>
    </AuthLayout>
  );
}
