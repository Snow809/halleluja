import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Code,
  Flex,
  Heading,
  HStack,
  Image,
  Input,
  PinInput,
  PinInputField,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth, roleToShell } from "@/app/AuthContext";
import { MFA_PENDING_KEY } from "./LoginPage";

interface PendingMfa {
  mfaToken: string;
  email: string;
  remember: boolean;
  setupRequired: boolean;
  qrCodeUrl?: string;
  secret?: string;
}

export function MfaPage() {
  const navigate = useNavigate();
  const { verifyMfa, user, shell } = useAuth();
  const [code, setCode] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const cardBg = useColorModeValue("white", "gray.800");

  const pending = useMemo<PendingMfa | null>(() => {
    try {
      const raw = sessionStorage.getItem(MFA_PENDING_KEY);
      return raw ? (JSON.parse(raw) as PendingMfa) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!pending && !user) navigate("/login", { replace: true });
  }, [navigate, pending, user]);

  if (user && !user.termsAccepted) return <Navigate to="/consent" replace />;
  if (user && shell) return <Navigate to={`/${shell}/dashboard`} replace />;
  if (!pending) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const token = (code || manualCode).replace(/\D/g, "");
    if (token.length !== 6) {
      setError("Saisissez le code à 6 chiffres de Google Authenticator.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const current = await verifyMfa({ mfaToken: pending.mfaToken, code: token, remember: pending.remember });
      sessionStorage.removeItem(MFA_PENDING_KEY);
      if (!current.termsAccepted) {
        navigate("/consent", { replace: true });
        return;
      }
      const nextShell = roleToShell(current.role);
      navigate(`/${nextShell}/dashboard`, { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Code MFA invalide.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" bg="linear-gradient(135deg, #eef5ff 0%, #ffffff 48%, #dbeafe 100%)" align="center" justify="center" p={6}>
      <Box maxW="520px" w="100%" bg={cardBg} borderRadius="24px" boxShadow="0 24px 70px rgba(47, 118, 223, 0.18)" p={{ base: 6, md: 10 }}>
        <Stack spacing={6}>
          <Box>
            <Heading size="lg" color="brand.500">
              Vérification MFA
            </Heading>
            <Text mt={2} color="gray.500">
              Connectez Google Authenticator pour {pending.email}, puis saisissez le code temporaire.
            </Text>
          </Box>

          {pending.setupRequired ? (
            <Stack align="center" spacing={3} p={4} bg="gray.50" borderRadius="18px">
              {pending.qrCodeUrl ? <Image src={pending.qrCodeUrl} alt="QR code Google Authenticator" boxSize="210px" /> : null}
              {pending.secret ? (
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  Clé manuelle : <Code>{pending.secret}</Code>
                </Text>
              ) : null}
            </Stack>
          ) : null}

          {error ? <Alert status="error" borderRadius="14px">{error}</Alert> : null}

          <Box as="form" onSubmit={submit}>
            <Stack spacing={5}>
              <HStack justify="center">
                <PinInput otp value={code} onChange={setCode}>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <PinInputField key={index} borderRadius="12px" />
                  ))}
                </PinInput>
              </HStack>
              <Input
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="Ou collez le code ici"
                inputMode="numeric"
                borderRadius="15px"
              />
              <Button type="submit" isLoading={loading}>
                Vérifier et continuer
              </Button>
              <Button variant="ghost" onClick={() => navigate("/login", { replace: true })}>
                Retour à la connexion
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Flex>
  );
}
