import { FormEvent, useEffect, useState } from "react";
import { Button, FormControl, FormLabel, Select, Stack, Text } from "@chakra-ui/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { PageHeader } from "@/purity/dashboard";
import { Panel } from "@/purity/dashboard";

export function Settings() {
  const query = useQuery({ queryKey: ["settings"], queryFn: () => api.get<{ locale: string; settings: Record<string, unknown> }>("/users/me/settings") });
  const [locale, setLocale] = useState("fr-FR");
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (query.data?.locale) setLocale(query.data.locale); }, [query.data]);
  const mutation = useMutation({ mutationFn: () => api.patch("/users/me/settings", { locale, settings: query.data?.settings ?? {} }), onSuccess: () => setSaved(true) });
  const submit = (event: FormEvent) => { event.preventDefault(); setSaved(false); mutation.mutate(); };
  return (
    <Stack as="form" onSubmit={submit} spacing={5} maxW="900px">
      <PageHeader title="Paramètres" subtitle="Personnalisez votre espace sans toucher aux données métier." />
      <Panel title="Interface">
        <FormControl><FormLabel>Langue</FormLabel><Select value={locale} onChange={(e) => setLocale(e.target.value)}><option value="fr-FR">Français</option><option value="en-US">English</option><option value="ar-MA">العربية</option></Select></FormControl>
        <Text mt={4} color="gray.500" fontSize="sm">Le thème principal est le style Purity bleu clair.</Text>
      </Panel>
      <Button type="submit" alignSelf="flex-start" isLoading={mutation.isPending}>{saved ? "Enregistré ✓" : "Enregistrer"}</Button>
    </Stack>
  );
}

