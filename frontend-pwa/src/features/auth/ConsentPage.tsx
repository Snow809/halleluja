import { Alert, AlertIcon, Button, Checkbox, Heading, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth, mobileHomeForShell } from "@/app/AuthContext";
import { AuthLayout } from "@/layouts/AuthLayout";
import { MobileCard } from "@/components/MobileCard";

export function ConsentPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!auth.user) return <Navigate to="/login" replace />;
  if (auth.user.termsAccepted) return <Navigate to={mobileHomeForShell(auth.shell)} replace />;

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post("/consents/me", { termsVersion: "2026-06", accepted: true });
      await auth.refreshUser();
      navigate(mobileHomeForShell(auth.shell), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer le consentement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <MobileCard w="100%" p={6}>
        <Stack spacing={5}>
          <Heading size="lg">Conditions d’utilisation</Heading>
          <Text color="gray.600">
            Intelli‑Talent traite vos données RH uniquement pour les usages autorisés : congés, documents, onboarding,
            notifications et assistance ARIA sécurisée. Les accès sensibles restent contrôlés par votre rôle.
          </Text>
          <Checkbox isChecked={accepted} onChange={(event) => setAccepted(event.target.checked)}>
            J’ai lu et j’accepte les conditions d’utilisation.
          </Checkbox>
          {error ? <Alert status="error" borderRadius="16px"><AlertIcon />{error}</Alert> : null}
          <Button isDisabled={!accepted} isLoading={loading} onClick={submit}>Accepter et entrer</Button>
        </Stack>
      </MobileCard>
    </AuthLayout>
  );
}
