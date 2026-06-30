import { Alert, AlertIcon, Box, Button, FormControl, FormLabel, Heading, Input, InputGroup, InputLeftElement, Stack, Switch, Text } from "@chakra-ui/react";
import { Lock, Mail, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/AuthContext";
import { AuthLayout } from "@/layouts/AuthLayout";
import { MobileCard } from "@/components/MobileCard";
import type { MfaChallenge } from "@/api/types";

const MFA_STORAGE_KEY = "intelli-talent-pwa-mfa-challenge";

export function saveMfaChallenge(challenge: MfaChallenge, remember: boolean) {
  sessionStorage.setItem(MFA_STORAGE_KEY, JSON.stringify({ challenge, remember }));
}

export function readMfaChallenge(): { challenge: MfaChallenge; remember: boolean } | null {
  try {
    const raw = sessionStorage.getItem(MFA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearMfaChallenge() {
  sessionStorage.removeItem(MFA_STORAGE_KEY);
}

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("collab@ydays.local");
  const [password, setPassword] = useState("password123");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const challenge = await auth.login(email, password, remember);
      saveMfaChallenge(challenge, remember);
      navigate("/mfa");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <MobileCard as="form" onSubmit={submit} w="100%" p={6}>
        <Stack spacing={5}>
          <Box bg="brand.500" color="white" boxSize="52px" borderRadius="18px" display="grid" placeItems="center">
            <Sparkles size={25} />
          </Box>
          <Box>
            <Heading size="lg">Intelli‑Talent</Heading>
            <Text color="gray.500">Accédez à votre espace RH mobile.</Text>
          </Box>
          {error ? <Alert status="error" borderRadius="16px"><AlertIcon />{error}</Alert> : null}
          <FormControl>
            <FormLabel>Email</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none"><Mail size={17} /></InputLeftElement>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" pl={10} />
            </InputGroup>
          </FormControl>
          <FormControl>
            <FormLabel>Mot de passe</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none"><Lock size={17} /></InputLeftElement>
              <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" pl={10} />
            </InputGroup>
          </FormControl>
          <Stack direction="row" align="center">
            <Switch isChecked={remember} onChange={(event) => setRemember(event.target.checked)} />
            <Text fontSize="sm">Se souvenir de moi</Text>
          </Stack>
          <Button type="submit" size="lg" isLoading={loading}>Continuer</Button>
          <Text fontSize="xs" color="gray.500" textAlign="center">Comptes seed : collab@ydays.local · manager@ydays.local</Text>
        </Stack>
      </MobileCard>
    </AuthLayout>
  );
}
