import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Box, Code, Link, ListItem, OrderedList, Table, Tbody, Td, Text, Th, Thead, Tr, UnorderedList } from "@chakra-ui/react";

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <Box
      sx={{
        "& > *:first-of-type": { mt: 0 },
        "& > *:last-child": { mb: 0 },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <Text mb={3} lineHeight="1.75">
              {children}
            </Text>
          ),
          ul: ({ children }) => (
            <UnorderedList spacing={1.5} mb={3} ps={3}>
              {children}
            </UnorderedList>
          ),
          ol: ({ children }) => (
            <OrderedList spacing={1.5} mb={3} ps={3}>
              {children}
            </OrderedList>
          ),
          li: ({ children }) => <ListItem>{children}</ListItem>,
          table: ({ children }) => (
            <Box overflowX="auto" my={3} borderWidth="1px" borderColor="app.border" borderRadius="14px">
              <Table size="sm" variant="simple">
                {children}
              </Table>
            </Box>
          ),
          thead: ({ children }) => <Thead bg="gray.50">{children}</Thead>,
          tbody: ({ children }) => <Tbody>{children}</Tbody>,
          tr: ({ children }) => <Tr>{children}</Tr>,
          th: ({ children }) => (
            <Th color="gray.600" fontSize="xs" letterSpacing="0.04em">
              {children}
            </Th>
          ),
          td: ({ children }) => (
            <Td color="gray.700" fontSize="sm">
              {children}
            </Td>
          ),
          a: ({ children, href }) => (
            <Link href={href} color="brand.500" fontWeight="bold" isExternal>
              {children}
            </Link>
          ),
          code: ({ children }) => (
            <Code colorScheme="blue" borderRadius="md">
              {children}
            </Code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
}
