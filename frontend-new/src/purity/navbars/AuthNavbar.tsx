/*
 * Adapted from the free MIT Purity UI Dashboard AuthNavbar component.
 * Uses the original frosted centered navbar geometry with Intelli‑Talent links.
 */
import { Badge, Button, Flex, HStack, Link, Text, useColorModeValue } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { FileText, Home, Sparkles, UserCircle } from "lucide-react";

export function AuthNavbar() {
  const navbarIcon = useColorModeValue("gray.700", "gray.200");
  const mainText = useColorModeValue("gray.700", "gray.200");
  const navbarBg = useColorModeValue(
    "linear-gradient(112.83deg, rgba(255, 255, 255, 0.82) 0%, rgba(255, 255, 255, 0.8) 110.84%)",
    "linear-gradient(112.83deg, rgba(255, 255, 255, 0.21) 0%, rgba(255, 255, 255, 0) 110.84%)",
  );

  return (
    <Flex
      position="fixed"
      top="16px"
      left="50%"
      transform="translate(-50%, 0px)"
      background={navbarBg}
      border="1.5px solid #FFFFFF"
      boxShadow="0px 7px 23px rgba(0, 0, 0, 0.05)"
      backdropFilter="blur(21px)"
      borderRadius="15px"
      px="16px"
      py="16px"
      mx="auto"
      width="1044px"
      maxW="90%"
      alignItems="center"
      zIndex={10}
    >
      <Flex w="100%" justifyContent={{ base: "start", lg: "space-between" }} align="center">
        <Link as={RouterLink} to="/login" display="flex" lineHeight="100%" fontWeight="bold" justifyContent="center" alignItems="center" color={mainText}>
          <Sparkles size={26} style={{ marginRight: 10 }} />
          <Text fontSize="sm" mt="3px">
            Intelli‑Talent
          </Text>
          <Badge colorScheme="blue" borderRadius="full" ms="8px">PRO</Badge>
        </Link>

        <HStack display={{ base: "none", lg: "flex" }}>
          <Button as={RouterLink} to="/login" fontSize="sm" px="0px" me="16px" color={navbarIcon} variant="ghost" leftIcon={<Home size={13} />}>
            <Text>Accueil</Text>
          </Button>
          <Button as={RouterLink} to="/profile" fontSize="sm" px="0px" me="16px" color={navbarIcon} variant="ghost" leftIcon={<UserCircle size={13} />}>
            <Text>Profil</Text>
          </Button>
          <Button as={RouterLink} to="/assistant" fontSize="sm" px="0px" me="16px" color={navbarIcon} variant="ghost" leftIcon={<FileText size={13} />}>
            <Text>ARIA</Text>
          </Button>
        </HStack>

        <Link href="https://github.com/creativetimofficial/purity-ui-dashboard" isExternal>
          <Button bg="linear-gradient(81.62deg, #1d4f9f 2.25%, #151928 79.87%)" color="white" fontSize="xs" borderRadius="35px" px="30px" display={{ base: "none", lg: "flex" }}>
            Purity source
          </Button>
        </Link>
      </Flex>
    </Flex>
  );
}
