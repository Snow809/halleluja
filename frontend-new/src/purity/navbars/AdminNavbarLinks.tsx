/*
 * Adapted from the free MIT Purity UI Dashboard AdminNavbarLinks component.
 * Demo menus are replaced with Intelli‑Talent notifications/profile actions.
 */
import { BellIcon, SearchIcon } from "@chakra-ui/icons";
import {
  Avatar,
  Badge,
  Button,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { Bot, Menu as MenuIcon, UserCircle } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import type { AuthUser } from "@/api/types";

interface AdminNavbarLinksProps {
  user?: AuthUser | null;
  unread: number;
  onOpenSidebar(): void;
  onOpenNotifications(): void;
  onOpenMiniAi(): void;
}

export function AdminNavbarLinks({ user, unread, onOpenSidebar, onOpenNotifications, onOpenMiniAi }: AdminNavbarLinksProps) {
  const inputBg = useColorModeValue("white", "gray.800");
  const mainText = useColorModeValue("gray.700", "gray.200");
  const navbarIcon = useColorModeValue("gray.500", "gray.200");
  const searchIcon = useColorModeValue("gray.700", "gray.200");

  return (
    <Flex pe={{ base: "0px", md: "16px" }} w={{ base: "100%", md: "auto" }} alignItems="center" flexDirection="row">
      <InputGroup
        cursor="pointer"
        bg={inputBg}
        borderRadius="15px"
        w={{ base: "128px", md: "200px" }}
        me={{ base: "auto", md: "20px" }}
        _focus={{ borderColor: "brand.500" }}
        _active={{ borderColor: "brand.500" }}
        display={{ base: "none", md: "flex" }}
      >
        <InputLeftElement>
          <IconButton
            aria-label="Recherche"
            bg="inherit"
            borderRadius="inherit"
            _hover={{ bg: "inherit" }}
            _active={{ bg: "inherit", transform: "none", borderColor: "transparent" }}
            _focus={{ boxShadow: "none" }}
            icon={<SearchIcon color={searchIcon} w="15px" h="15px" />}
          />
        </InputLeftElement>
        <Input fontSize="xs" py="11px" color={mainText} placeholder="Rechercher..." borderRadius="inherit" />
      </InputGroup>

      <Button
        as={RouterLink}
        to="/profile"
        ms="0px"
        px="0px"
        me={{ base: "2px", md: "16px" }}
        color={navbarIcon}
        variant="ghost"
        rightIcon={<UserCircle size={20} />}
      >
        <Text display={{ base: "none", md: "flex" }}>{user?.fullName?.split(" ")[0] ?? "Profil"}</Text>
      </Button>

      <IconButton
        aria-label="Menu"
        icon={<MenuIcon size={19} />}
        display={{ base: "inline-flex", lg: "none" }}
        variant="ghost"
        color={navbarIcon}
        me="12px"
        onClick={onOpenSidebar}
      />

      <IconButton aria-label="Mini assistant IA" icon={<Bot size={18} />} variant="ghost" color={navbarIcon} me="16px" onClick={onOpenMiniAi} />

      <Menu>
        <MenuButton position="relative" onClick={onOpenNotifications}>
          <BellIcon color={navbarIcon} w="18px" h="18px" />
          {unread ? <Badge position="absolute" top="-12px" right="-10px" colorScheme="red" borderRadius="full">{unread}</Badge> : null}
        </MenuButton>
        <MenuList p="16px 8px">
          <Flex flexDirection="column">
            <MenuItem borderRadius="8px" mb="10px" onClick={onOpenNotifications}>
              <Avatar size="sm" name="ARIA" bg="brand.500" color="white" me="12px" />
              <Flex direction="column">
                <Text fontWeight="bold" fontSize="sm">Notifications RH</Text>
                <Text fontSize="xs" color="gray.500">{unread ? `${unread} non lue(s)` : "Aucune nouvelle notification"}</Text>
              </Flex>
            </MenuItem>
            <MenuItem as={RouterLink} to="/assistant" borderRadius="8px">
              <Avatar size="sm" name="ARIA" bg="brand.50" color="brand.500" me="12px" />
              <Flex direction="column">
                <Text fontWeight="bold" fontSize="sm">Assistant ARIA</Text>
                <Text fontSize="xs" color="gray.500">Ouvrir l'espace conversation</Text>
              </Flex>
            </MenuItem>
          </Flex>
        </MenuList>
      </Menu>
    </Flex>
  );
}
