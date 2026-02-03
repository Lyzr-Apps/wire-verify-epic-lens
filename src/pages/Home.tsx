import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Upload, X, FileText, Image as ImageIcon, File, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Loader2, ArrowLeft, ExternalLink, Plus, PackageSearch, FolderOpen } from 'lucide-react'
import { callAIAgent } from '@/utils/aiAgent'
import { cn } from '@/lib/utils'

// AGENT IDs - Real 24-char hex strings from test results
const WIRE_VERIFICATION_MANAGER_AGENT_ID = '6980b3bf066158e77fdea70b'

// TypeScript Interfaces from ACTUAL test response structure
interface ExtractedFieldValue {
  value: string | number
  confidence: number
}

interface SignatureBoundingBox {
  x: number
  y: number
  width: number
  height: number
}

interface SignatureInfo {
  location: string
  bounding_box: SignatureBoundingBox
  confidence: number
  type: string
}

interface SignatureDetection {
  signatures_found: number
  signatures: SignatureInfo[]
}

interface DocumentQuality {
  clarity: number
  completeness: number
  issues: string[]
}

interface ExtractedDocumentData {
  account_number: ExtractedFieldValue
  routing_number: ExtractedFieldValue
  transfer_amount: ExtractedFieldValue
  beneficiary_name: ExtractedFieldValue
  beneficiary_account: ExtractedFieldValue
  originator_name: ExtractedFieldValue
  date: ExtractedFieldValue
}

interface ExtractedDocument {
  document_type: string
  file_name: string
  extracted_data: ExtractedDocumentData
  signature_detection: SignatureDetection
  document_quality: DocumentQuality
}

interface ExtractionResults {
  document_type: string
  extracted_data: ExtractedDocument[]
}

interface ValidationRule {
  rule_id: string
  rule_name: string
  status: 'PASS' | 'FAIL' | 'FLAG'
  severity: string
  message: string
  deep_link: string | null
  affected_documents: string[]
  remediation: string
}

interface ValidationSummary {
  total_rules_checked: number
  passed: number
  failed: number
  flagged: number
}

interface ComplianceChecks {
  signature_requirements: {
    required: number
    found: number
    status: string
  }
  amount_limits: {
    transfer_amount: number
    daily_limit: number | null
    remaining_limit: number | null
    status: string
  }
  account_verification: {
    accounts_validated: number
    consistency_check: string
  }
}

interface ValidationResults {
  overall_validation_status: 'PASS' | 'FAIL' | 'FLAG'
  validation_summary: ValidationSummary
  validation_rules: ValidationRule[]
  compliance_checks: ComplianceChecks
  recommendations: string[]
}

interface FinalDecision {
  approved: boolean
  requires_manual_review: boolean
  blocking_issues: string[]
  warnings: string[]
}

interface ProcessingSummary {
  total_documents_processed: number
  extraction_confidence: number
  validation_pass_rate: number
  critical_issues_count: number
}

interface WireVerificationResult {
  workflow_status: string
  extraction_results: ExtractionResults
  validation_results: ValidationResults
  final_decision: FinalDecision
  processing_summary: ProcessingSummary
}

interface WireVerificationResponse {
  status: string
  result: WireVerificationResult
  metadata: {
    agent_name: string
    timestamp: string
    total_processing_time_ms: number
    sub_agents_invoked: string[]
  }
}

interface UploadedFile {
  file: File
  id: string
}

interface StoredVerification {
  id: string
  result: WireVerificationResponse
  timestamp: string
  clerkNotes: string
}

type View = 'list' | 'detail'

// Component: File Icon
function FileIcon({ fileName }: { fileName: string }) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return <FileText className="h-5 w-5 text-red-500" />
  if (['png', 'jpg', 'jpeg', 'tiff'].includes(ext || '')) return <ImageIcon className="h-5 w-5 text-blue-500" />
  return <File className="h-5 w-5 text-gray-500" />
}

// Component: Status Badge (Light Theme)
function StatusBadge({ status }: { status: 'PASS' | 'FAIL' | 'FLAG' }) {
  const styles = {
    PASS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    FAIL: 'bg-red-50 text-red-700 border-red-200',
    FLAG: 'bg-amber-50 text-amber-700 border-amber-200'
  }

  const icons = {
    PASS: <CheckCircle2 className="h-3.5 w-3.5" />,
    FAIL: <XCircle className="h-3.5 w-3.5" />,
    FLAG: <AlertTriangle className="h-3.5 w-3.5" />
  }

  return (
    <Badge className={cn('border gap-1.5', styles[status])}>
      {icons[status]}
      {status}
    </Badge>
  )
}

// Component: Validation Rule Card (Light Theme)
function ValidationRuleCard({ rule }: { rule: ValidationRule }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-white border-gray-200">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={rule.status} />
                  <Badge variant="outline" className="text-xs border-gray-300 text-gray-700">
                    {rule.severity}
                  </Badge>
                </div>
                <CardTitle className="text-gray-900 text-base">{rule.rule_name}</CardTitle>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div>
              <p className="text-sm text-gray-700 mb-3">{rule.message}</p>
              {rule.deep_link && (
                <a
                  href={rule.deep_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Issue in Document
                </a>
              )}
            </div>

            <Separator className="bg-gray-200" />

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Affected Documents</p>
              <div className="flex flex-wrap gap-2">
                {rule.affected_documents.map((doc, i) => (
                  <Badge key={i} variant="outline" className="text-xs border-gray-300 text-gray-700">
                    {doc}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Remediation</p>
              <p className="text-sm text-gray-700">{rule.remediation}</p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// Component: Upload Modal
function UploadModal({
  isOpen,
  onClose,
  files,
  onFilesChange,
  onProcess,
  isProcessing
}: {
  isOpen: boolean
  onClose: () => void
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  onProcess: () => void
  isProcessing: boolean
}) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      return ['pdf', 'png', 'jpg', 'jpeg', 'tiff'].includes(ext || '')
    })

    const newFiles = droppedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7)
    }))

    onFilesChange([...files, ...newFiles])
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      const newFiles = selectedFiles.map(file => ({
        file,
        id: Math.random().toString(36).substring(7)
      }))
      onFilesChange([...files, ...newFiles])
    }
  }

  const removeFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900 text-xl">Upload Wire Packet</DialogTitle>
          <DialogDescription className="text-gray-600">
            Upload wire transfer documents for automated verification
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragging
                ? 'border-black bg-gray-50'
                : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
            )}
          >
            <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-900 font-medium mb-1">
              Drag and drop files here
            </p>
            <p className="text-sm text-gray-500 mb-3">
              Supports PDF, PNG, JPG, TIFF
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.tiff"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload-modal"
            />
            <label htmlFor="file-upload-modal">
              <Button variant="outline" className="border-gray-300" asChild>
                <span>Browse Files</span>
              </Button>
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Files ({files.length})</p>
              <ScrollArea className="h-48 border border-gray-200 rounded-md bg-white">
                <div className="p-3 space-y-2">
                  {files.map((uploadedFile) => (
                    <div
                      key={uploadedFile.id}
                      className="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-md"
                    >
                      <FileIcon fileName={uploadedFile.file.name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {uploadedFile.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(uploadedFile.file.size)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(uploadedFile.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                onProcess()
                onClose()
              }}
              disabled={files.length === 0 || isProcessing}
              className="flex-1 bg-black hover:bg-gray-800 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Packet'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Component: Processing Screen (Modal Overlay)
function ProcessingScreen({ currentStep, totalDocs }: { currentStep: number; totalDocs: number }) {
  const steps = [
    { name: 'Uploading', description: 'Uploading documents to secure storage' },
    { name: 'Extracting', description: 'OCR and data extraction' },
    { name: 'Validating', description: 'Compliance rule checking' },
    { name: 'Complete', description: 'Finalizing results' }
  ]

  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
      <Card className="w-full max-w-2xl bg-white border-gray-200">
        <CardHeader className="text-center">
          <CardTitle className="text-gray-900 text-2xl">Processing Wire Packet</CardTitle>
          <CardDescription className="text-gray-600">
            Processing Document {Math.min(currentStep + 1, totalDocs)} of {totalDocs}...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <Progress value={progress} className="h-2" />

          <div className="space-y-4">
            {steps.map((step, index) => {
              const isActive = index === currentStep
              const isComplete = index < currentStep

              return (
                <div key={index} className="flex items-center gap-4">
                  <div
                    className={cn(
                      'flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center',
                      isComplete
                        ? 'bg-emerald-500 border-emerald-500'
                        : isActive
                        ? 'border-black bg-gray-100'
                        : 'border-gray-300 bg-white'
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    ) : isActive ? (
                      <Loader2 className="h-5 w-5 text-black animate-spin" />
                    ) : (
                      <span className="text-gray-400">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={cn(
                        'font-medium',
                        isActive || isComplete ? 'text-gray-900' : 'text-gray-400'
                      )}
                    >
                      {step.name}
                    </p>
                    <p className="text-sm text-gray-500">{step.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Component: Empty State
function EmptyState({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-lg bg-white border-gray-200 text-center">
        <CardHeader className="pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <FolderOpen className="h-10 w-10 text-gray-400" />
            </div>
          </div>
          <CardTitle className="text-gray-900 text-2xl">No Verifications Yet</CardTitle>
          <CardDescription className="text-gray-600 text-base">
            Start your first wire packet verification to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onOpenModal}
            className="bg-black hover:bg-gray-800 text-white"
            size="lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Start Verification
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Component: Verification Detail View
function VerificationDetailView({
  result,
  clerkNotes,
  onClerkNotesChange,
  onBack
}: {
  result: WireVerificationResponse
  clerkNotes: string
  onClerkNotesChange: (notes: string) => void
  onBack: () => void
}) {
  if (!result?.result?.validation_results || !result?.result?.extraction_results) {
    return (
      <div className="flex items-center justify-center p-12">
        <Card className="w-full max-w-md bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Loading Results...</CardTitle>
            <CardDescription className="text-gray-600">
              Please wait while we process the verification data
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const { validation_results, extraction_results, final_decision, processing_summary } = result.result

  // Additional safety check for compliance_checks
  if (!validation_results?.compliance_checks) {
    return (
      <div className="flex items-center justify-center p-12">
        <Card className="w-full max-w-md bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Processing Results...</CardTitle>
            <CardDescription className="text-gray-600">
              Validation data is incomplete. Please try processing again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={onBack}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <CardDescription className="text-gray-500 text-xs uppercase">Status</CardDescription>
            <div className="pt-1">
              <StatusBadge status={validation_results.overall_validation_status} />
            </div>
          </CardHeader>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <CardDescription className="text-gray-500 text-xs uppercase">Documents</CardDescription>
            <CardTitle className="text-gray-900 text-2xl">
              {processing_summary.total_documents_processed}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <CardDescription className="text-gray-500 text-xs uppercase">Confidence</CardDescription>
            <CardTitle className="text-gray-900 text-2xl">
              {(processing_summary.extraction_confidence * 100).toFixed(0)}%
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <CardDescription className="text-gray-500 text-xs uppercase">Issues</CardDescription>
            <CardTitle className="text-red-600 text-2xl">
              {processing_summary.critical_issues_count}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Validation Summary */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Validation Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Total Rules</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {validation_results.validation_summary.total_rules_checked}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Passed</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {validation_results.validation_summary.passed}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Failed</p>
                  <p className="text-2xl font-bold text-red-600">
                    {validation_results.validation_summary.failed}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Flagged</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {validation_results.validation_summary.flagged}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Validation Rules */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900">Validation Rules</h2>
            {validation_results.validation_rules.map((rule, index) => (
              <ValidationRuleCard key={index} rule={rule} />
            ))}
          </div>

          {/* Compliance Checks */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Compliance Checks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                <div>
                  <p className="text-sm font-medium text-gray-900">Signature Requirements</p>
                  <p className="text-xs text-gray-600">
                    Found {validation_results.compliance_checks.signature_requirements.found} of{' '}
                    {validation_results.compliance_checks.signature_requirements.required} required
                  </p>
                </div>
                <StatusBadge
                  status={
                    validation_results.compliance_checks.signature_requirements.status as 'PASS' | 'FAIL' | 'FLAG'
                  }
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                <div>
                  <p className="text-sm font-medium text-gray-900">Amount Limits</p>
                  <p className="text-xs text-gray-600">
                    Transfer: ${validation_results.compliance_checks.amount_limits.transfer_amount.toLocaleString()}
                  </p>
                </div>
                <StatusBadge
                  status={validation_results.compliance_checks.amount_limits.status as 'PASS' | 'FAIL' | 'FLAG'}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                <div>
                  <p className="text-sm font-medium text-gray-900">Account Verification</p>
                  <p className="text-xs text-gray-600">
                    {validation_results.compliance_checks.account_verification.accounts_validated} accounts validated
                  </p>
                </div>
                <StatusBadge
                  status={
                    validation_results.compliance_checks.account_verification.consistency_check as
                      | 'PASS'
                      | 'FAIL'
                      | 'FLAG'
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {validation_results.recommendations.length > 0 && (
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {validation_results.recommendations.map((rec, index) => (
                    <li key={index} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-blue-600 flex-shrink-0">{index + 1}.</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Extracted Data Table */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Extracted Data Details</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 hover:bg-gray-50">
                      <TableHead className="text-gray-700">Document</TableHead>
                      <TableHead className="text-gray-700">Account</TableHead>
                      <TableHead className="text-gray-700">Routing</TableHead>
                      <TableHead className="text-gray-700">Amount</TableHead>
                      <TableHead className="text-gray-700">Beneficiary</TableHead>
                      <TableHead className="text-gray-700">Originator</TableHead>
                      <TableHead className="text-gray-700">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extraction_results.extracted_data.map((doc, index) => (
                      <TableRow key={index} className="border-gray-200 hover:bg-gray-50">
                        <TableCell className="text-gray-900 font-medium">{doc.file_name}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-sm text-gray-900">{doc.extracted_data.account_number.value || '-'}</p>
                            {doc.extracted_data.account_number.confidence > 0 && (
                              <p className="text-xs text-gray-500">
                                {(doc.extracted_data.account_number.confidence * 100).toFixed(0)}% conf
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-sm text-gray-900">{doc.extracted_data.routing_number.value || '-'}</p>
                            {doc.extracted_data.routing_number.confidence > 0 && (
                              <p className="text-xs text-gray-500">
                                {(doc.extracted_data.routing_number.confidence * 100).toFixed(0)}% conf
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-sm text-gray-900">
                              {doc.extracted_data.transfer_amount.value
                                ? `$${Number(doc.extracted_data.transfer_amount.value).toLocaleString()}`
                                : '-'}
                            </p>
                            {doc.extracted_data.transfer_amount.confidence > 0 && (
                              <p className="text-xs text-gray-500">
                                {(doc.extracted_data.transfer_amount.confidence * 100).toFixed(0)}% conf
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-sm text-gray-900">{doc.extracted_data.beneficiary_name.value || '-'}</p>
                            {doc.extracted_data.beneficiary_name.confidence > 0 && (
                              <p className="text-xs text-gray-500">
                                {(doc.extracted_data.beneficiary_name.confidence * 100).toFixed(0)}% conf
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-sm text-gray-900">{doc.extracted_data.originator_name.value || '-'}</p>
                            {doc.extracted_data.originator_name.confidence > 0 && (
                              <p className="text-xs text-gray-500">
                                {(doc.extracted_data.originator_name.confidence * 100).toFixed(0)}% conf
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-sm text-gray-900">{doc.extracted_data.date.value || '-'}</p>
                            {doc.extracted_data.date.confidence > 0 && (
                              <p className="text-xs text-gray-500">
                                {(doc.extracted_data.date.confidence * 100).toFixed(0)}% conf
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Final Decision */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Final Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                <span className="text-sm font-medium text-gray-900">Approved</span>
                <span className={cn('text-sm font-bold', final_decision.approved ? 'text-emerald-600' : 'text-red-600')}>
                  {final_decision.approved ? 'YES' : 'NO'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                <span className="text-sm font-medium text-gray-900">Manual Review</span>
                <span className={cn('text-sm font-bold', final_decision.requires_manual_review ? 'text-amber-600' : 'text-emerald-600')}>
                  {final_decision.requires_manual_review ? 'REQUIRED' : 'NOT REQUIRED'}
                </span>
              </div>

              {final_decision.blocking_issues.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-red-600 uppercase">Blocking Issues</p>
                  <ul className="space-y-1.5">
                    {final_decision.blocking_issues.map((issue, index) => (
                      <li key={index} className="flex gap-2 text-xs text-gray-700">
                        <XCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {final_decision.warnings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-amber-600 uppercase">Warnings</p>
                  <ul className="space-y-1.5">
                    {final_decision.warnings.map((warning, index) => (
                      <li key={index} className="flex gap-2 text-xs text-gray-700">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Extracted Documents */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Extracted Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3 pr-4">
                  {extraction_results.extracted_data.map((doc, index) => (
                    <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <div className="flex items-start gap-2 mb-2">
                        <FileIcon fileName={doc.file_name} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                          <p className="text-xs text-gray-600 capitalize">
                            {doc.document_type.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>

                      <Separator className="bg-gray-200 my-2" />

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Clarity</span>
                          <span className="text-gray-900">
                            {(doc.document_quality.clarity * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Completeness</span>
                          <span className="text-gray-900">
                            {(doc.document_quality.completeness * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Signatures</span>
                          <span className="text-gray-900">{doc.signature_detection.signatures_found}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Clerk Notes */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Clerk Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={clerkNotes}
                onChange={(e) => onClerkNotesChange(e.target.value)}
                placeholder="Add any additional notes or observations..."
                className="min-h-32 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              disabled={!final_decision.approved}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              size="lg"
            >
              Submit to Wires
            </Button>
            <Button
              variant="outline"
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-100"
              size="lg"
            >
              Return for Correction
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Component: Dashboard List View
function DashboardListView({
  results,
  onSelectResult,
  onOpenModal
}: {
  results: Array<{ id: string; result: WireVerificationResponse; timestamp: string }>
  onSelectResult: (id: string) => void
  onOpenModal: () => void
}) {
  if (results.length === 0) {
    return <EmptyState onOpenModal={onOpenModal} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Wire Verifications</h2>
          <p className="text-gray-600">View and manage wire packet verifications</p>
        </div>
        <Button onClick={onOpenModal} className="bg-black hover:bg-gray-800 text-white">
          <Plus className="h-4 w-4 mr-2" />
          New Verification
        </Button>
      </div>

      <div className="grid gap-4">
        {results.map((item) => {
          const { result } = item
          const validation_results = result.result.validation_results
          const processing_summary = result.result.processing_summary

          return (
            <Card
              key={item.id}
              className="bg-white border-gray-200 hover:border-gray-300 cursor-pointer transition-colors"
              onClick={() => onSelectResult(item.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-gray-900">Packet {item.id}</CardTitle>
                      <StatusBadge status={validation_results.overall_validation_status} />
                    </div>
                    <CardDescription className="text-gray-600">
                      Processed {new Date(item.timestamp).toLocaleString()}
                    </CardDescription>
                  </div>
                  <PackageSearch className="h-5 w-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 text-xs">Documents</p>
                    <p className="text-gray-900 font-semibold">
                      {processing_summary.total_documents_processed}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Confidence</p>
                    <p className="text-gray-900 font-semibold">
                      {(processing_summary.extraction_confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Rules Passed</p>
                    <p className="text-emerald-600 font-semibold">
                      {validation_results.validation_summary.passed}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Issues</p>
                    <p className="text-red-600 font-semibold">
                      {processing_summary.critical_issues_count}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// Main Home Component
export default function Home() {
  const [view, setView] = useState<View>('list')
  const [verifications, setVerifications] = useState<StoredVerification[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedVerification = selectedId
    ? verifications.find(v => v.id === selectedId)
    : null

  const handleProcess = async () => {
    setError(null)
    setIsProcessing(true)
    setProcessingStep(0)

    try {
      // Step 1: Upload files to Lyzr
      console.log('Step 1: Uploading files to Lyzr...')
      const { uploadFiles } = await import('@/utils/aiAgent')

      const uploadResult = await uploadFiles(files.map(f => f.file))

      if (!uploadResult.success || uploadResult.asset_ids.length === 0) {
        throw new Error(uploadResult.error || 'Failed to upload files')
      }

      console.log('Files uploaded successfully:', uploadResult.asset_ids)
      setProcessingStep(1)
      await new Promise(resolve => setTimeout(resolve, 500))

      // Step 2: Call agent with uploaded files
      const fileList = files.map(f => f.file.name).join(', ')
      const message = `Process wire packet with ${files.length} documents: ${fileList}. Perform complete OCR extraction and validation.`

      console.log('Step 2: Calling Wire Verification Manager with message:', message)
      console.log('With asset IDs:', uploadResult.asset_ids)

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Agent request timeout after 60 seconds')), 60000)
      )

      const response = await Promise.race([
        callAIAgent(message, WIRE_VERIFICATION_MANAGER_AGENT_ID, {
          assets: uploadResult.asset_ids
        }),
        timeoutPromise
      ])

      console.log('Agent Response Received:', response)
      setProcessingStep(2)
      await new Promise(resolve => setTimeout(resolve, 500))

      if (response.success && response.response) {
        const wireResponse: WireVerificationResponse = {
          status: response.response.status,
          result: response.response.result as WireVerificationResult,
          metadata: response.response.metadata || {
            agent_name: 'Wire Verification Manager',
            timestamp: new Date().toISOString(),
            total_processing_time_ms: 0,
            sub_agents_invoked: ['Multi-Modal OCR & Extraction Agent', 'Validation & Verification Agent']
          }
        }

        if (!wireResponse.result?.validation_results || !wireResponse.result?.extraction_results) {
          console.warn('Response missing required fields, using structured fallback')
          throw new Error('Invalid response structure from agent')
        }

        console.log('Verification complete, adding to list')

        // Create new verification record
        const newVerification: StoredVerification = {
          id: `WP-${new Date().getTime().toString().slice(-8)}`,
          result: wireResponse,
          timestamp: new Date().toISOString(),
          clerkNotes: ''
        }

        setVerifications(prev => [newVerification, ...prev])
        setSelectedId(newVerification.id)
        setView('detail')
        setFiles([])
        setIsProcessing(false)
      } else {
        const errorMsg = response.error || response.response?.message || 'Agent processing failed'
        console.error('Agent returned error:', errorMsg)
        setError(errorMsg)
        setIsProcessing(false)
      }
    } catch (err) {
      console.error('Exception during processing:', err)
      const errorMessage = err instanceof Error ? err.message : 'Processing error occurred'
      setError(errorMessage)
      setIsProcessing(false)
    }
  }

  const handleSelectResult = (id: string) => {
    setSelectedId(id)
    setView('detail')
  }

  const handleBackToList = () => {
    setView('list')
    setSelectedId(null)
  }

  const handleClerkNotesChange = (notes: string) => {
    if (selectedId) {
      setVerifications(prev =>
        prev.map(v => (v.id === selectedId ? { ...v, clerkNotes: notes } : v))
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-black border-b border-gray-800">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-white">Wire Verification Command Center</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {view === 'list' && (
          <DashboardListView
            results={verifications}
            onSelectResult={handleSelectResult}
            onOpenModal={() => setIsModalOpen(true)}
          />
        )}

        {view === 'detail' && selectedVerification && (
          <VerificationDetailView
            result={selectedVerification.result}
            clerkNotes={selectedVerification.clerkNotes}
            onClerkNotesChange={handleClerkNotesChange}
            onBack={handleBackToList}
          />
        )}
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        files={files}
        onFilesChange={setFiles}
        onProcess={handleProcess}
        isProcessing={isProcessing}
      />

      {/* Processing Screen Overlay */}
      {isProcessing && <ProcessingScreen currentStep={processingStep} totalDocs={files.length} />}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-md shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-white hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
