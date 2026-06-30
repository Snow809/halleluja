/*
 * Profile page adapted from the free MIT Purity UI Dashboard profile page.
 * Demo content is replaced with authenticated Intelli‑Talent user/employee data.
 */
import { Grid, Icon, SimpleGrid, Text } from "@chakra-ui/react";
import { Briefcase, Calendar, FolderOpen, Settings, UserCircle } from "lucide-react";
import { useAuth } from "@/app/AuthContext";
import { Panel } from "@/purity/dashboard";
import { StatCard } from "@/purity/dashboard";
import { PlatformSettings, ProfileHeader, ProfileInformation } from "@/purity/profile";
import profileBackground from "@/assets/purity/ProfileBackground.png";
import avatar from "@/assets/purity/avatar4.png";

export function Profile() {
  const { user } = useAuth();
  const employee = user?.employee;
  if (!user) return null;

  if (!employee) {
    return (
      <Panel>
        <UserCircle size={60} color="#2f76df" />
        <Text mt={4} fontSize="2xl" fontWeight="900">{user.fullName}</Text>
        <Text color="gray.500">{user.email}</Text>
        <Text mt={5}>Ce compte n'est pas lié à un dossier employé.</Text>
      </Panel>
    );
  }

  const rows = [
    { label: "Nom complet", value: user.fullName },
    { label: "Mobile", value: employee.phone ?? "Non renseigné" },
    { label: "Email", value: employee.email },
    { label: "Localisation", value: employee.location ?? "Non renseignée" },
    { label: "Poste", value: employee.position?.title ?? "Non assigné" },
    { label: "Département", value: employee.department?.name ?? "Sans département" },
    { label: "Date d'arrivée", value: new Date(employee.hireDate).toLocaleDateString("fr-FR") },
  ];

  return (
    <>
      <ProfileHeader
        backgroundHeader={profileBackground}
        avatarImage={avatar}
        name={user.fullName}
        email={employee.email}
        subtitle={`${employee.position?.title ?? user.role} · ${employee.department?.name ?? "Sans département"}`}
        tabs={[
          { name: "OVERVIEW", icon: <Icon as={UserCircle} /> },
          { name: "DOSSIER", icon: <Icon as={FolderOpen} /> },
          { name: "PARAMÈTRES", icon: <Icon as={Settings} /> },
        ]}
      />

      <Grid templateColumns={{ base: "1fr", xl: "repeat(3, 1fr)" }} gap="22px" mb="22px">
        <PlatformSettings
          title="Paramètres plateforme"
          groups={[
            {
              title: "COMPTE",
              items: [
                { label: "M'avertir des réponses RH", checked: true },
                { label: "Me notifier des documents générés", checked: true },
                { label: "Me rappeler les tâches onboarding", checked: true },
              ],
            },
            {
              title: "APPLICATION",
              items: [
                { label: "Activer les suggestions ARIA", checked: true },
                { label: "Recevoir les alertes importantes", checked: true },
              ],
            },
          ]}
        />
        <ProfileInformation
          title="Informations profil"
          description="Votre profil est alimenté par le dossier RH autorisé. Les données sensibles restent contrôlées par les règles de rôle du backend."
          rows={rows}
        />
        <Panel title="Résumé RH">
          <SimpleGrid columns={{ base: 1, sm: 2, xl: 1 }} spacing={4}>
            <StatCard label="Congés" value={`${employee.vacationBalanceDays} j`} icon={Calendar} />
            <StatCard label="RTT" value={`${employee.rttBalanceDays} j`} icon={Calendar} />
            <StatCard label="Présence" value={`${employee.presenceScore}%`} icon={Briefcase} />
            <StatCard label="Performance" value={`${employee.performanceScore}%`} icon={Briefcase} />
          </SimpleGrid>
        </Panel>
      </Grid>
    </>
  );
}
