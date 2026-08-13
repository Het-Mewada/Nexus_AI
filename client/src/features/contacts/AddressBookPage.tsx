import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Phone, Mail, Edit2, Trash2, Calendar, Tag, Link2, MapPin, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { contactsApi, addressesApi } from "@/services/api";
import { toast } from "sonner";
import type { Contact, Address } from "@/types";
import { useGoogleLogin } from "@react-oauth/google";

function ContactsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  const [formData, setFormData] = useState({
    name: "", relationship: "", email: "", phone: "",
    notes: "", birthday: "", tagsInput: "", linkedin: "", twitter: "",
  });

  const { data: contactsResponse, isLoading } = useQuery({
    queryKey: ["contacts", search],
    queryFn: () => contactsApi.list(search ? { search } : undefined),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Contact>) => contactsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact added successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to add contact"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Contact> & { id: string }) => contactsApi.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact updated successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to update contact"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact deleted successfully");
    },
    onError: () => toast.error("Failed to delete contact"),
  });

  const resetForm = () => {
    setEditingContact(null);
    setFormData({
      name: "", relationship: "", email: "", phone: "",
      notes: "", birthday: "", tagsInput: "", linkedin: "", twitter: "",
    });
  };

  const openEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name || "",
      relationship: contact.relationship || "",
      email: contact.email || "",
      phone: contact.phone || "",
      notes: contact.notes || "",
      birthday: contact.birthday ? (contact.birthday.split('T')[0] ?? "") : "",
      tagsInput: contact.tags ? contact.tags.join(', ') : "",
      linkedin: contact.socialMediaLinks?.linkedin || "",
      twitter: contact.socialMediaLinks?.twitter || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) return toast.error("Name is required");

    const payload = {
      ...formData,
      tags: formData.tagsInput ? formData.tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [],
      socialMediaLinks: {
        ...(formData.linkedin && { linkedin: formData.linkedin }),
        ...(formData.twitter && { twitter: formData.twitter }),
      },
      birthday: formData.birthday ? new Date(formData.birthday).toISOString() : null,
    };

    // Remove temporary input fields
    const { tagsInput, linkedin, twitter, ...finalPayload } = payload as any;

    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, ...finalPayload });
    } else {
      createMutation.mutate(finalPayload);
    }
  };

  const importGoogleContacts = async (accessToken: string) => {
    try {
      setIsSyncing(true);
      setSyncProgress({ current: 0, total: 0 });
      let allConnections: any[] = [];
      let pageToken = "";

      do {
        const url = `https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await response.json();

        if (data.connections) {
          allConnections = [...allConnections, ...data.connections];
        }
        pageToken = data.nextPageToken || "";
      } while (pageToken);

      if (allConnections.length > 0) {
        const existingContacts = contactsResponse?.data || [];

        const validConnections = allConnections.filter(person => {
          const name = person.names?.[0]?.displayName;
          if (!name) return false;

          const email = person.emailAddresses?.[0]?.value || null;
          const phone = person.phoneNumbers?.[0]?.value || null;

          return !existingContacts.some(c =>
            (c.name.toLowerCase() === name.toLowerCase()) ||
            (email && c.email === email) ||
            (phone && c.phone === phone)
          );
        });

        setSyncProgress({ current: 0, total: validConnections.length });
        let imported = 0;
        const CHUNK_SIZE = 100;

        for (let i = 0; i < validConnections.length; i += CHUNK_SIZE) {
          const chunk = validConnections.slice(i, i + CHUNK_SIZE).map(person => ({
            name: person.names?.[0]?.displayName,
            email: person.emailAddresses?.[0]?.value || null,
            phone: person.phoneNumbers?.[0]?.value || null,
          }));

          await contactsApi.bulkCreate(chunk);
          imported += chunk.length;
          setSyncProgress(prev => ({ ...prev, current: imported }));
        }

        if (imported > 0) {
          toast.success(`Successfully imported ${imported} new contacts from Google!`);
          queryClient.invalidateQueries({ queryKey: ["contacts"] });
        } else {
          toast.info("No new contacts to import (all found were duplicates or unusable).");
        }
      } else {
        toast.info("No contacts found in your Google account.");
      }
    } catch (error) {
      toast.error("Failed to import Google Contacts");
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const loginGoogle = useGoogleLogin({
    onSuccess: (codeResponse) => importGoogleContacts(codeResponse.access_token),
    onError: (error) => toast.error('Google Login Failed'),
    scope: "https://www.googleapis.com/auth/contacts.readonly",
  });

  return (
    <div className="space-y-6 mt-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts by name, email, phone..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loginGoogle()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Sync Google Contacts
          </Button>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <p className="text-muted-foreground">Loading contacts...</p>
        ) : contactsResponse?.data?.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-12">No contacts found.</p>
        ) : (
          contactsResponse?.data?.map((contact) => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow relative group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{contact.name}</h3>
                    {contact.relationship && (
                      <span className="inline-block px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full mt-1">
                        {contact.relationship}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(contact)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm('Delete contact?')) deleteMutation.mutate(contact.id) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  {contact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${contact.email}`} className="hover:text-primary transition-colors">{contact.email}</a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${contact.phone}`} className="hover:text-primary transition-colors">{contact.phone}</a>
                    </div>
                  )}
                  {contact.birthday && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(contact.birthday).toLocaleDateString()}</span>
                    </div>
                  )}

                  {contact.socialMediaLinks && Object.entries(contact.socialMediaLinks).length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <Link2 className="h-4 w-4" />
                      <div className="flex gap-2">
                        {Object.entries(contact.socialMediaLinks).map(([platform, link]) => (
                          <a key={platform} href={link as string} target="_blank" rel="noreferrer" className="text-primary hover:underline capitalize">
                            {platform}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {contact.tags && contact.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                      {contact.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                          <Tag className="mr-1 h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContact ? "Edit Contact" : "Add Contact"}</DialogTitle>
            <DialogDescription>
              Store phone numbers, emails, social media, and tags for this person.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Input placeholder="e.g. Family, Friend" value={formData.relationship} onChange={(e) => setFormData({ ...formData, relationship: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Birthday</Label>
              <Input type="date" value={formData.birthday} onChange={(e) => setFormData({ ...formData, birthday: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tags (Comma separated)</Label>
              <Input placeholder="e.g. work, VIP" value={formData.tagsInput} onChange={(e) => setFormData({ ...formData, tagsInput: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>LinkedIn URL</Label>
              <Input value={formData.linkedin} onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Twitter URL</Label>
              <Input value={formData.twitter} onChange={(e) => setFormData({ ...formData, twitter: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Notes</Label>
              <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingContact ? "Save Changes" : "Add Contact"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSyncing} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Syncing Google Contacts</DialogTitle>
            <DialogDescription>
              Please wait while we securely import your contacts. Do not close this window.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold tracking-tight text-primary">
                {syncProgress.current} <span className="text-muted-foreground text-lg font-normal">/ {syncProgress.total}</span>
              </p>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Contacts Imported
              </p>
            </div>
            {/* Visual Progress Bar */}
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-in-out"
                style={{ width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddressesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const [formData, setFormData] = useState({
    title: "", addressLine1: "", addressLine2: "",
    city: "", state: "", zipCode: "", country: "", notes: "",
  });

  const { data: addressesResponse, isLoading } = useQuery({
    queryKey: ["addresses", search],
    queryFn: () => addressesApi.list(search ? { search } : undefined),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Address>) => addressesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Address added successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to add address"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Address> & { id: string }) => addressesApi.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Address updated successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to update address"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => addressesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Address deleted successfully");
    },
    onError: () => toast.error("Failed to delete address"),
  });

  const resetForm = () => {
    setEditingAddress(null);
    setFormData({
      title: "", addressLine1: "", addressLine2: "",
      city: "", state: "", zipCode: "", country: "", notes: "",
    });
  };

  const openEdit = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      title: address.title || "",
      addressLine1: address.addressLine1 || "",
      addressLine2: address.addressLine2 || "",
      city: address.city || "",
      state: address.state || "",
      zipCode: address.zipCode || "",
      country: address.country || "",
      notes: address.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title) return toast.error("Title is required");
    if (!formData.addressLine1) return toast.error("Address Line 1 is required");

    if (editingAddress) {
      updateMutation.mutate({ id: editingAddress.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6 mt-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search addresses by title, city..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Address
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <p className="text-muted-foreground">Loading addresses...</p>
        ) : addressesResponse?.data?.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-12">No addresses found.</p>
        ) : (
          addressesResponse?.data?.map((address) => (
            <Card key={address.id} className="hover:shadow-md transition-shadow relative group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {address.title}
                    </h3>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(address)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm('Delete address?')) deleteMutation.mutate(address.id) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground mt-2">
                  <p>{address.addressLine1}</p>
                  {address.addressLine2 && <p>{address.addressLine2}</p>}
                  <p>{address.city}, {address.state} {address.zipCode}</p>
                  <p>{address.country}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingAddress ? "Edit Address" : "Add Address"}</DialogTitle>
            <DialogDescription>
              Store completely independent physical addresses.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label>Address Title *</Label>
              <Input placeholder="e.g. Home, Office, Summer House" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Address Line 1 *</Label>
              <Input value={formData.addressLine1} onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Address Line 2</Label>
              <Input value={formData.addressLine2} onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>City *</Label>
              <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>State/Province *</Label>
              <Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>ZIP/Postal Code *</Label>
              <Input value={formData.zipCode} onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Country *</Label>
              <Input value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Notes</Label>
              <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingAddress ? "Save Changes" : "Add Address"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AddressBookPage() {
  return (
    <div className=" max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Address Book</h1>
        <p className="text-muted-foreground mt-2">
          Manage your personal connections and independent addresses.
        </p>
      </div>

      <Tabs defaultValue="contacts" className="w-full">
        <TabsList className="inline-flex flex-wrap h-auto justify-start">
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          {/* <TabsTrigger value="addresses">Addresses</TabsTrigger> */}
        </TabsList>
        <TabsContent value="contacts">
          <ContactsTab />
        </TabsContent>
        {/* <TabsContent value="addresses">
          <AddressesTab />
        </TabsContent> */}
      </Tabs>
    </div>
  );
}
