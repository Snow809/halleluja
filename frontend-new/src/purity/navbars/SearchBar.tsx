/*
 * Adapted from the free MIT Purity UI Dashboard SearchBar idea.
 */
import type { ComponentProps } from "react";
import { Input, InputGroup, InputLeftElement } from "@chakra-ui/react";
import { Search } from "lucide-react";

export function SearchBar(props: ComponentProps<typeof Input>) {
  return (
    <InputGroup maxW="280px">
      <InputLeftElement pointerEvents="none" color="gray.400" h="40px">
        <Search size={18} />
      </InputLeftElement>
      <Input
        h="40px"
        bg="white"
        borderColor="gray.100"
        borderRadius="15px"
        boxShadow="0px 3.5px 5.5px rgba(0, 0, 0, 0.02)"
        color="gray.700"
        _placeholder={{ color: "gray.400" }}
        {...props}
      />
    </InputGroup>
  );
}
