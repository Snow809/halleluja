import { FormEvent, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Center,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth, roleToShell } from "@/app/AuthContext";
import type { ConsentStatus } from "@/api/types";

export function ConsentPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [rights, setRights] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const cardBg = useColorModeValue("white", "gray.800");

  if (authLoading) {
    return (
      <Center minH="100vh">
        <Spinner color="brand.500" />
      </Center>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.termsAccepted) {
    const shell = roleToShell(user.role);
    return <Navigate to={`/${shell}/dashboard`} replace />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!terms || !privacy || !rights) {
      setError("Vous devez accepter les trois points obligatoires pour continuer.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post<ConsentStatus>("/consents/me", {
        termsAccepted: terms,
        privacyAccepted: privacy,
        rightsNoticeAccepted: rights,
        preferences: {},
      });
      const current = await refreshUser();
      const shell = roleToShell(current.role);
      navigate(`/${shell}/dashboard`, { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d'enregistrer le consentement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" bg="gray.50" align="center" justify="center" p={6}>
      <Box maxW="780px" w="100%" bg={cardBg} borderRadius="24px" boxShadow="0 24px 70px rgba(47, 118, 223, 0.14)" p={{ base: 6, md: 10 }}>
        <Stack spacing={6}>
          <Box>
            <Heading size="lg">Conditions générales et consentements</Heading>
            <Text mt={3} color="gray.500">
              Avant d’accéder à Intelli-Talent, confirmez que vous avez pris connaissance des règles de sécurité,
              de confidentialité et de traitement des données RH.
            </Text>
          </Box>

          <Box p={5} bg="gray.50" borderRadius="18px" color="gray.600" fontSize="sm" lineHeight="1.8">
            <Text>
              Les données affichées dans la plateforme sont strictement réservées à un usage professionnel RH.
              Les accès sont tracés et contrôlés selon votre rôle. Les documents sensibles peuvent être anonymisés
              pour les profils autorisés non propriétaires.
            </Text>
            <Text mt={3}>
              Vous disposez de droits d’accès, de rectification, d’opposition et de demande d’effacement. Les demandes
              de droit à l’oubli sont placées dans une file de revue RH/Admin et ne déclenchent aucune suppression
              automatique dans cette version.
            </Text>
          </Box>

          {error ? <Alert status="error" borderRadius="14px">{error}</Alert> : null}

          <Stack as="form" onSubmit={submit} spacing={4}>
            <Checkbox colorScheme="brand" isChecked={terms} onChange={(event) => setTerms(event.target.checked)}>
              J’accepte les conditions générales d’utilisation.
            </Checkbox>
            <Checkbox colorScheme="brand" isChecked={privacy} onChange={(event) => setPrivacy(event.target.checked)}>
              Je comprends que mes données RH sont traitées selon mon rôle et les règles de confidentialité.
            </Checkbox>
            <Checkbox colorScheme="brand" isChecked={rights} onChange={(event) => setRights(event.target.checked)}>
              Je reconnais avoir été informé de mes droits, dont la demande de droit à l’oubli.
            </Checkbox>
            <Button type="submit" alignSelf="flex-start" isLoading={loading}>
              Accepter et continuer
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Flex>
  );
}
