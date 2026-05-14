import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Users2, Settings } from "lucide-react";

export default function AdminPage() {
  const sections = [
    {
      href: "/admin/users",
      icon: Users,
      title: "User Management",
      description: "Create, edit, and manage user accounts and roles",
      color: "bg-blue-50 text-blue-600",
    },
    {
      href: "/admin/groups",
      icon: Users2,
      title: "Group Management",
      description: "Manage teams and assign members to groups",
      color: "bg-purple-50 text-purple-600",
    },
    {
      href: "/admin/departments",
      icon: Building2,
      title: "Departments & Sites",
      description: "Configure departments, sites, and locations",
      color: "bg-green-50 text-green-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-500 mt-1">Manage system settings, users, and configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className={`inline-flex p-3 rounded-xl ${section.color} w-fit mb-2`}>
                  <section.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
