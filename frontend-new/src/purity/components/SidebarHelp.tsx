/*
 * Adapted from the free MIT Purity UI Dashboard SidebarHelp component
 * by Creative Tim / Simmmple. Updated for React + TypeScript and blue theme.
 */
import { QuestionIcon } from "@chakra-ui/icons";
import { Button, Flex, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { IconBox } from "./IconBox";
import sidebarHelpImage from "@/assets/purity/SidebarHelpImage.png";

export function SidebarHelp() {
  return (
    <Flex
      borderRadius="15px"
      flexDirection="column"
      bg="linear-gradient(135deg, #2f76df 0%, #1f5fc4 55%, #86b8ff 100%)"
      bgSize="cover"
      justifyContent="flex-start"
      alignItems="start"
      boxSize="border-box"
      p="16px"
      h="170px"
      w="100%"
      overflow="hidden"
      position="relative"
      _before={{
        content: '""',
        position: "absolute",
        inset: 0,
        bgImage: `url(${sidebarHelpImage})`,
        bgSize: "cover",
        bgPosition: "center",
        filter: "hue-rotate(42deg) saturate(1.35)",
        opacity: 0.34,
      }}
      _after={{
        content: '""',
        position: "absolute",
        inset: 0,
        bg: "linear-gradient(135deg, rgba(47, 118, 223, 0.48), rgba(31, 95, 196, 0.24))",
      }}
    >
      <IconBox width="35px" h="35px" bg="white" mb="auto" position="relative" zIndex={1}>
        <QuestionIcon color="brand.500" h="18px" w="18px" />
      </IconBox>
      <Text fontSize="sm" color="white" fontWeight="bold" position="relative" zIndex={1}>
        Besoin d'aide ?
      </Text>
      <Text fontSize="xs" color="white" mb="10px" position="relative" zIndex={1}>
        ARIA peut vous guider
      </Text>
      <Button
        as={RouterLink}
        to="/assistant"
        fontSize="10px"
        fontWeight="bold"
        w="100%"
        bg="white"
        _hover={{ bg: "white" }}
        color="gray.700"
        position="relative"
        zIndex={1}
      >
        OUVRIR ARIA
      </Button>
    </Flex>
  );
}
