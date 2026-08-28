import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trash2, FileText, Download, File, Image as ImageIcon, Search, UploadCloud, Eye, Shield, Lock, ShieldCheck, Fingerprint } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { ProtectDocumentModal } from "./components/ProtectDocumentModal";
import { UnlockDocumentModal } from "./components/UnlockDocumentModal";
import { documentApi } from "@/services/api";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { Document } from "@/types";

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("IDENTITY");
  const [file, setFile] = useState<File | null>(null);
  
  // Modals state
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [protectDoc, setProtectDoc] = useState<Document | null>(null);
  const [unlockDoc, setUnlockDoc] = useState<Document | null>(null);
  const [unlockMode, setUnlockMode] = useState<"VIEW" | "DOWNLOAD">("VIEW");

  const { data: docsResponse, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: documentApi.getDocuments,
  });

  const documents = docsResponse?.data || [];
  
  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(search.toLowerCase()) || 
    doc.type.toLowerCase().includes(search.toLowerCase())
  );

  const uploadMutation = useMutation({
    mutationFn: (data: FormData) => documentApi.uploadDocument(data),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["documents"] }); 
      toast.success("Document uploaded successfully"); 
      handleClose(); 
    },
    onError: () => toast.error("Failed to upload document"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentApi.deleteDocument(id),
    onSuccess: (_, id) => { 
      queryClient.invalidateQueries({ queryKey: ["documents"] }); 
      toast.success("Document deleted"); 
      if (selectedDoc?.id === id) setSelectedDoc(null);
    },
    onError: () => toast.error("Failed to delete document"),
  });

  const handleClose = () => {
    setIsOpen(false);
    setTitle("");
    setType("IDENTITY");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Please select a file");
    if (!title) return toast.error("Please enter a title");
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("type", type);
    
    uploadMutation.mutate(formData);
  };

  const getFileExt = (fileName: string) => fileName.split('.').pop()?.toLowerCase() || '';

  const getFileIcon = (fileName: string) => {
    const ext = getFileExt(fileName);
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return <ImageIcon className="h-8 w-8 text-blue-500" />;
    if (['pdf'].includes(ext)) return <FileText className="h-8 w-8 text-red-500" />;
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const handleDocumentAction = (doc: Document, action: "VIEW" | "DOWNLOAD") => {
    if (doc.isProtected) {
      setUnlockMode(action);
      setUnlockDoc(doc);
    } else {
      if (action === "VIEW") {
        setSelectedDoc(doc);
      } else {
        handleUnprotectedDownload(doc);
      }
    }
  };

  const handleUnprotectedDownload = async (doc: Document) => {
    if (!doc.fileUrl) return toast.error("File URL unavailable");
    try {
      const response = await fetch(doc.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = getFileExt(doc.name);
      a.download = ext ? `${doc.title}.${ext}` : doc.title;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col border-b border-border/80 pb-7 sm:flex-row sm:items-end sm:justify-between gap-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Document Vault</h1>
          <p className="text-muted-foreground mt-1">Securely store and cryptographically lock your financial and identity documents</p>
        </div>
        <Button onClick={() => setIsOpen(true)} variant="gradient">
          <UploadCloud className="h-4 w-4 mr-2" /> Upload Document
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Card key={i} className="animate-pulse h-48 bg-muted" />)}
        </div>
      ) : filteredDocs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold">No documents found</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-6 max-w-sm">Upload your PAN card, Aadhar, Tax Returns, or Insurance Policies for easy access.</p>
            <Button onClick={() => setIsOpen(true)} variant="gradient"><UploadCloud className="h-4 w-4 mr-2" /> Upload File</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocs.map((doc, i) => (
            <motion.div key={doc.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
              <Card 
                className="hover:shadow-md transition-shadow group relative overflow-hidden cursor-pointer bg-card border-border/80 rounded-[16px]"
                onClick={() => handleDocumentAction(doc, "VIEW")}
              >
                <CardContent className="p-5 flex flex-col items-center text-center">
                  {/* Protection Badge Header */}
                  {doc.isProtected && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      <Lock className="h-3 w-3" /> Protected
                    </div>
                  )}

                  {/* Top Right Actions */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                    {!doc.isProtected && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary bg-background/80 hover:bg-primary hover:text-white rounded-[6px]"
                        title="Protect Document"
                        onClick={(e) => { e.stopPropagation(); setProtectDoc(doc); }}
                      >
                        <Shield className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <ConfirmDeleteDialog title="Delete Document" onConfirm={() => deleteMutation.mutate(doc.id)}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive bg-background/80 hover:bg-destructive hover:text-white rounded-[6px]" onClick={(e) => e.stopPropagation()}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </ConfirmDeleteDialog>
                  </div>
                  
                  <div className="p-4 bg-muted/30 rounded-full mb-3 mt-2">
                    {getFileIcon(doc.name)}
                  </div>
                  
                  <h3 className="font-semibold text-sm line-clamp-1 w-full" title={doc.title}>{doc.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">{doc.type} • {formatDate(doc.createdAt)}</p>
                  
                  {/* Protection indicators */}
                  {doc.isProtected ? (
                    <div className="flex items-center justify-center gap-2 text-[11px] mb-4 bg-muted/40 py-1 px-3 rounded-[8px] border border-border/40 w-full">
                      <span className="text-emerald-500 font-semibold flex items-center gap-0.5">✓ Password</span>
                      {doc.enableBiometrics && <span className="text-indigo-500 font-semibold flex items-center gap-0.5">✓ Biometrics</span>}
                    </div>
                  ) : (
                    <div className="mb-4 h-5" />
                  )}

                  <div className="flex gap-2 w-full mt-auto">
                    <Button variant="secondary" size="sm" className="flex-1 text-xs" onClick={(e) => { e.stopPropagation(); handleDocumentAction(doc, "VIEW"); }}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={(e) => { e.stopPropagation(); handleDocumentAction(doc, "DOWNLOAD"); }}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="rounded-[18px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Add a new document to your secure vault</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label>Document Title</Label>
              <Input placeholder="e.g. PAN Card, FY24 Tax Return" value={title} onChange={(e) => setTitle(e.target.value)} required className="rounded-[10px]" />
            </div>
            
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="rounded-[10px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDENTITY">Identity Proof (Aadhar, PAN)</SelectItem>
                  <SelectItem value="TAX">Tax Documents (Form 16, ITR)</SelectItem>
                  <SelectItem value="INSURANCE">Insurance Policies</SelectItem>
                  <SelectItem value="INVESTMENT">Investment Proofs</SelectItem>
                  <SelectItem value="PROPERTY">Property Documents</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>File</Label>
              <Input 
                type="file" 
                ref={fileInputRef}
                onChange={(e) => setFile(e.target.files?.[0] || null)} 
                accept=".pdf,.jpg,.jpeg,.png"
                required 
                className="cursor-pointer rounded-[10px]"
              />
              <p className="text-xs text-muted-foreground">Supported formats: PDF, JPG, PNG (Max 5MB)</p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={uploadMutation.isPending || !file || !title}>
                {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unprotected Document Viewer Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={(open) => { if (!open) setSelectedDoc(null); }}>
        <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col rounded-[18px]">
          <DialogHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <DialogTitle>{selectedDoc?.title}</DialogTitle>
              <DialogDescription>{selectedDoc?.name} • {selectedDoc?.type}</DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 bg-muted/30 rounded-md overflow-hidden relative flex items-center justify-center">
            {selectedDoc && selectedDoc.fileUrl && (
              ['jpg', 'jpeg', 'png', 'gif'].includes(getFileExt(selectedDoc.name)) ? (
                <img 
                  src={selectedDoc.fileUrl} 
                  alt={selectedDoc.title} 
                  className="max-w-full max-h-full object-contain"
                />
              ) : getFileExt(selectedDoc.name) === 'pdf' ? (
                <iframe 
                  src={`${selectedDoc.fileUrl}#view=FitH`} 
                  className="w-full h-full border-0"
                  title={selectedDoc.title}
                />
              ) : (
                <div className="text-center p-8">
                  <File className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Preview not available for this file type.</p>
                </div>
              )
            )}
          </div>
          
          <DialogFooter className="mt-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setSelectedDoc(null)}>
              Close
            </Button>
            <Button 
              type="button" 
              variant="default"
              onClick={() => selectedDoc && handleUnprotectedDownload(selectedDoc)}
            >
              <Download className="h-4 w-4 mr-2" /> Download Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Protect Document Setup Modal */}
      <ProtectDocumentModal
        document={protectDoc}
        isOpen={!!protectDoc}
        onClose={() => setProtectDoc(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["documents"] });
        }}
      />

      {/* Unlock Document Modal */}
      <UnlockDocumentModal
        document={unlockDoc}
        mode={unlockMode}
        isOpen={!!unlockDoc}
        onClose={() => setUnlockDoc(null)}
      />
    </div>
  );
}
