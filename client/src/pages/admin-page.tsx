import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Users } from "lucide-react";
import { User } from "@shared/schema";

type QualifiedUser = Omit<User, "password">;

export default function AdminPage() {
  const { data: qualifiedUsers, isLoading } = useQuery<QualifiedUser[]>({
    queryKey: ["/api/admin/qualified-users"],
  });
  
  // Function to export users as CSV
  const exportUsers = () => {
    if (!qualifiedUsers || qualifiedUsers.length === 0) return;
    
    // Create CSV content
    const headers = ["ID", "Username", "Email"];
    const csvRows = [
      headers.join(","),
      ...qualifiedUsers.map(user => [
        user.id,
        user.username,
        user.email
      ].join(","))
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    
    // Create download link and trigger download
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "qualified_users.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        <div className="max-w-6xl mx-auto my-8 px-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl font-bold">Qualified Users</CardTitle>
              <Button onClick={exportUsers} disabled={isLoading || !qualifiedUsers || qualifiedUsers.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export to CSV
              </Button>
            </CardHeader>
            
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !qualifiedUsers || qualifiedUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Users className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-xl font-medium text-gray-700 mb-2">No Qualified Users Yet</h3>
                  <p className="text-gray-500 max-w-md">
                    When users watch 4 ads and qualify for rewards, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {qualifiedUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.id}</TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              <div className="mt-6 text-center text-sm text-gray-500">
                <p>Total qualified users: {qualifiedUsers?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
