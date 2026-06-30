/*
 * Login page adapted from the free MIT Purity UI Dashboard `views/Auth/SignIn.js`.
 * The form is wired to Intelli‑Talent auth and the original teal accent is replaced with blue.
 */
import { FormEvent, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Link,
  Switch,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/AuthContext";
import signInImage from "@/assets/purity/signInImage.png";

export function LoginPage() {
  const { login, user, shell } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const titleColor = useColorModeValue("brand.500", "brand.200");
  const textColor = useColorModeValue("gray.400", "white");

  useEffect(() => {
    if (user && shell) navigate(`/${shell}/dashboard`, { replace: true });
  }, [navigate, shell, user]);

  if (user && shell) return <Navigate to={`/${shell}/dashboard`} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, remember);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="white" position="relative" overflow="hidden">
      <Box position="absolute" inset={0} bg="linear-gradient(135deg, #eef5ff 0%, #ffffff 42%, #d9eaff 100%)" />
      <Box position="absolute" top="-90px" left="-90px" w="280px" h="280px" borderRadius="52px" bg="brand.100" opacity={0.65} animation="floatGeometry 12s ease-in-out infinite" />
      <Box position="absolute" bottom="80px" left="42%" w="180px" h="180px" borderRadius="35px" bg="brand.200" opacity={0.35} transform="rotate(28deg)" animation="floatGeometry 15s ease-in-out infinite reverse" />
      <Box position="absolute" top="14%" right="12%" w="120px" h="120px" borderRadius="full" bg="brand.300" opacity={0.28} animation="slowPulse 8s ease-in-out infinite" />
      <Box
        position="absolute"
        inset="-2px"
        opacity={0.12}
        bgImage="linear-gradient(#2f76df 1px, transparent 1px), linear-gradient(90deg, #2f76df 1px, transparent 1px)"
        bgSize="58px 58px"
        filter="blur(0.7px)"
        pointerEvents="none"
        style={{ maskImage: "linear-gradient(90deg, transparent, black 24%, black 76%, transparent)" }}
      />
      <Flex position="relative" mb="40px">
        <Flex
          h={{ base: "initial", md: "75vh", lg: "85vh" }}
          w="100%"
          maxW="1044px"
          mx="auto"
          justifyContent="space-between"
          mb="30px"
          pt={{ base: "40px", md: "0px" }}
        >
          <Flex alignItems="center" justifyContent="start" style={{ userSelect: "none" }} w={{ base: "100%", md: "50%", lg: "42%" }}>
            <Flex
              direction="column"
              w="100%"
              bg="rgba(255, 255, 255, 0.9)"
              backdropFilter="blur(18px)"
              border="1px solid"
              borderColor="whiteAlpha.700"
              boxShadow="0 24px 70px rgba(47, 118, 223, 0.18)"
              borderRadius="24px"
              p={{ base: "28px", md: "48px" }}
              mt={{ md: "150px", lg: "80px" }}
            >
              <Heading color={titleColor} fontSize="32px" mb="10px">
                Bienvenue
              </Heading>
              <Text mb="36px" ms="4px" color={textColor} fontWeight="bold" fontSize="14px">
                Connectez-vous à votre espace Intelli‑Talent
              </Text>
              <Box as="form" onSubmit={submit}>
                <FormControl>
                  {error ? <Alert status="error" borderRadius="15px" mb="18px">{error}</Alert> : null}
                  <FormLabel ms="4px" fontSize="sm" fontWeight="normal">
                    Email
                  </FormLabel>
                  <Input
                    borderRadius="15px"
                    mb="24px"
                    fontSize="sm"
                    type="email"
                    placeholder="Votre adresse e-mail"
                    size="lg"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <FormLabel ms="4px" fontSize="sm" fontWeight="normal">
                    Mot de passe
                  </FormLabel>
                  <Input
                    borderRadius="15px"
                    mb="28px"
                    fontSize="sm"
                    type="password"
                    placeholder="Votre mot de passe"
                    size="lg"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <FormControl display="flex" alignItems="center">
                    <Switch id="remember-login" colorScheme="brand" me="10px" isChecked={remember} onChange={(event) => setRemember(event.target.checked)} />
                    <FormLabel htmlFor="remember-login" mb="0" ms="1" fontWeight="normal">
                      Se souvenir de moi
                    </FormLabel>
                  </FormControl>
                  <Button
                    fontSize="10px"
                    type="submit"
                    bg="brand.500"
                    w="100%"
                    h="45px"
                    mb="20px"
                    color="white"
                    mt="20px"
                    isLoading={loading}
                    _hover={{ bg: "brand.400" }}
                    _active={{ bg: "brand.600" }}
                  >
                    SE CONNECTER
                  </Button>
                </FormControl>
              </Box>
              <Flex flexDirection="column" justifyContent="center" alignItems="center" maxW="100%" mt="0px">
                <Text color={textColor} fontWeight="medium" textAlign="center">
                  Comptes seed :
                  <Link color={titleColor} as="span" ms="5px" fontWeight="bold">
                    admin / hr / manager / collab @ydays.local
                  </Link>
                </Text>
              </Flex>
            </Flex>
          </Flex>
          <Box display={{ base: "none", md: "block" }} overflowX="hidden" h="100%" w="40vw" position="absolute" right="0px">
            <Box
              bgImage={signInImage}
              w="100%"
              h="100%"
              bgSize="cover"
              bgPosition="50%"
              position="absolute"
              borderBottomLeftRadius="20px"
              filter="hue-rotate(38deg) saturate(1.25)"
            />
            <Box position="absolute" inset={0} bg="brand.600" opacity={0.18} borderBottomLeftRadius="20px" />
          </Box>
        </Flex>
      </Flex>
    </Box>
  );
}
