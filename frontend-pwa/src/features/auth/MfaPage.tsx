import { Alert, AlertIcon, Button, FormControl, FormLabel, Heading, Image, Input, PinInput, PinInputField, HStack, Stack, Text } from "@chakra-ui/react";
import { FormEvent, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth, mobileHomeForShell, roleToShell } from "@/app/AuthContext";
import { AuthLayout } from "@/layouts/AuthLayout";
import { MobileCard } from "@/components/MobileCard";
import { clearMfaChallenge, readMfaChallenge } from "./LoginPage";

export function MfaPage() {
  const stored = useMemo(() => readMfaChallenge(), []);
  const auth = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!stored) return <Navigate to="/login" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const user = await auth.verifyMfa({ mfaToken: stored.challenge.mfaToken, code, remember: stored.remember });
      clearMfaChallenge();
      if (!user.termsAccepted) navigate("/consent", { replace: true });
      else navigate(mobileHomeForShell(roleToShell(user.role)), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code MFA invalide.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <MobileCard as="form" onSubmit={submit} w="100%" p={6}>
        <Stack spacing={5}>
          <Heading size="lg">Validation MFA</Heading>
          <Text color="gray.500">Ouvrez Google Authenticator et entrez le code à 6 chiffres.</Text>
          {stored.challenge.setupRequired ? (
            <Stack align="center" bg="brand.50" p={4} borderRadius="18px">
              {stored.challenge.qrCodeUrl ? <Image src={stored.challenge.qrCodeUrl} alt="QR code MFA" maxW="220px" borderRadius="12px" /> : null}
              {stored.challenge.secret ? <Text fontSize="xs" color="gray.600" wordBreak="break-all">Secret : {stored.challenge.secret}</Text> : null}
            </Stack>
          ) : null}
          {error ? <Alert status="error" borderRadius="16px"><AlertIcon />{error}</Alert> : null}
          <FormControl>
            <FormLabel>Code</FormLabel>
            <HStack justify="center">
              <PinInput value={code} onChange={setCode} otp>
                {Array.from({ length: 6 }).map((_, index) => <PinInputField key={index} />)}
              </PinInput>
            </HStack>
          </FormControl>
          <Button type="submit" size="lg" isLoading={loading} isDisabled={code.length !== 6}>Valider</Button>
        </Stack>
      </MobileCard>
    </AuthLayout>
  );
}
