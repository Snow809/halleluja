import { Box, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <Box className="markdown-message">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <Text mb={2}>{children}</Text>,
          table: ({ children }) => <Table size="sm" my={2}>{children}</Table>,
          thead: ({ children }) => <Thead>{children}</Thead>,
          tbody: ({ children }) => <Tbody>{children}</Tbody>,
          tr: ({ children }) => <Tr>{children}</Tr>,
          th: ({ children }) => <Th>{children}</Th>,
          td: ({ children }) => <Td>{children}</Td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
}
