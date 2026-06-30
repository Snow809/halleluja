/*
 * Adapted from the free MIT Purity UI Dashboard Profile Header component.
 */
import { Avatar, Box, Button, Flex, Text, useColorModeValue } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface ProfileTab {
  name: string;
  icon: ReactNode;
}

interface ProfileHeaderProps {
  backgroundHeader: string;
  avatarImage?: string;
  name: string;
  email: string;
  subtitle?: string;
  tabs: ProfileTab[];
}

export function ProfileHeader({ backgroundHeader, avatarImage, name, email, subtitle, tabs }: ProfileHeaderProps) {
  const textColor = useColorModeValue("gray.700", "white");
  const borderProfileColor = useColorModeValue("white", "rgba(255, 255, 255, 0.31)");
  const emailColor = useColorModeValue("gray.400", "gray.300");
  const backgroundProfile = useColorModeValue(
    "hsla(0,0%,100%,.8)",
    "linear-gradient(112.83deg, rgba(255, 255, 255, 0.21) 0%, rgba(255, 255, 255, 0) 110.84%)",
  );

  return (
    <Box mb={{ base: "230px", md: "135px", xl: "118px" }} borderRadius="15px" px="0px" display="flex" flexDirection="column" justifyContent="center" alignItems="center">
      <Box
        w="100%"
        h="300px"
        borderRadius="25px"
        position="relative"
        display="flex"
        justifyContent="center"
        bg="linear-gradient(135deg, #2f76df 0%, #1f5fc4 58%, #86b8ff 100%)"
      >
        <Box
          position="absolute"
          inset={0}
          bgImage={backgroundHeader}
          bgPosition="50%"
          bgRepeat="no-repeat"
          bgSize="cover"
          filter="hue-rotate(42deg) saturate(1.28)"
          opacity={0.44}
          borderRadius="25px"
        />
        <Box
          position="absolute"
          inset={0}
          bg="linear-gradient(135deg, rgba(47, 118, 223, 0.42), rgba(31, 95, 196, 0.2) 55%, rgba(134, 184, 255, 0.32))"
          borderRadius="25px"
        />
        <Flex
          direction={{ base: "column", md: "row" }}
          mx="1.5rem"
          maxH="330px"
          w={{ base: "90%", xl: "95%" }}
          justifyContent={{ base: "center", md: "space-between" }}
          align="center"
          backdropFilter="saturate(200%) blur(50px)"
          position="absolute"
          boxShadow="0px 2px 5.5px rgba(0, 0, 0, 0.02)"
          border="2px solid"
          borderColor={borderProfileColor}
          bg={backgroundProfile}
          p="24px"
          borderRadius="20px"
          top={{ base: "170px", md: "220px" }}
          zIndex={1}
        >
          <Flex align="center" mb={{ base: "10px", md: "0px" }} direction={{ base: "column", md: "row" }} w={{ base: "100%" }} textAlign={{ base: "center", md: "start" }}>
            <Avatar me={{ md: "22px" }} src={avatarImage} name={name} w="80px" h="80px" borderRadius="15px" bg="brand.500" color="white" />
            <Flex direction="column" maxWidth="100%" my={{ base: "14px" }}>
              <Text fontSize={{ base: "lg", lg: "xl" }} color={textColor} fontWeight="bold" ms={{ base: "8px", md: "0px" }}>
                {name}
              </Text>
              <Text fontSize={{ base: "sm", md: "md" }} color={emailColor} fontWeight="semibold">
                {subtitle ?? email}
              </Text>
            </Flex>
          </Flex>
          <Flex direction={{ base: "column", lg: "row" }} w={{ base: "100%", md: "50%", lg: "auto" }}>
            {tabs.map((tab, index) => (
              <Button key={tab.name} p="0px" bg="transparent" _hover={{ bg: "none" }}>
                <Flex
                  align="center"
                  w={{ base: "100%", lg: "135px" }}
                  bg={index === 0 ? "hsla(0,0%,100%,.3)" : "transparent"}
                  borderRadius="15px"
                  justifyContent="center"
                  py="10px"
                  mx={index === 1 ? { lg: "1rem" } : undefined}
                  boxShadow={index === 0 ? "inset 0 0 1px 1px hsl(0deg 0% 100% / 90%), 0 20px 27px 0 rgb(0 0 0 / 5%)" : undefined}
                  border={index === 0 ? "1px solid" : undefined}
                  borderColor={index === 0 ? "gray.200" : undefined}
                  cursor="pointer"
                >
                  {tab.icon}
                  <Text fontSize="xs" color={textColor} fontWeight="bold" ms="6px">
                    {tab.name}
                  </Text>
                </Flex>
              </Button>
            ))}
          </Flex>
        </Flex>
      </Box>
    </Box>
  );
}
