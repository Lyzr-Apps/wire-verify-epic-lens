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
import { Upload, X, FileText, Image as ImageIcon, File, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Loader2, ArrowLeft, ExternalLink } from 'lucide-react'
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

type Screen = 'upload' | 'processing' | 'dashboard'

// Component: File Icon
function FileIcon({ fileName }: { fileName: string }) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return <FileText className="h-5 w-5 text-red-500" />
  if (['png', 'jpg', 'jpeg', 'tiff'].includes(ext || '')) return <ImageIcon className="h-5 w-5 text-blue-500" />
  return <File className="h-5 w-5 text-gray-500" />
}

// Component: Status Badge
function StatusBadge({ status }: { status: 'PASS' | 'FAIL' | 'FLAG' }) {
  const styles = {
    PASS: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    FAIL: 'bg-red-500/10 text-red-500 border-red-500/20',
    FLAG: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
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

// Component: Validation Rule Card
function ValidationRuleCard({ rule }: { rule: ValidationRule }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-slate-800 border-slate-700">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-slate-700/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={rule.status} />
                  <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                    {rule.severity}
                  </Badge>
                </div>
                <CardTitle className="text-white text-base">{rule.rule_name}</CardTitle>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-slate-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div>
              <p className="text-sm text-slate-300 mb-3">{rule.message}</p>
              {rule.deep_link && (
                <a
                  href={rule.deep_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Issue in Document
                </a>
              )}
            </div>

            <Separator className="bg-slate-700" />

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Affected Documents</p>
              <div className="flex flex-wrap gap-2">
                {rule.affected_documents.map((doc, i) => (
                  <Badge key={i} variant="outline" className="text-xs border-slate-600 text-slate-300">
                    {doc}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-md p-3">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-1.5">Remediation</p>
              <p className="text-sm text-slate-300">{rule.remediation}</p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// Component: Upload Screen
function UploadScreen({
  files,
  onFilesChange,
  onProcess,
  isProcessing
}: {
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Wire Verification Command Center</CardTitle>
          <CardDescription className="text-slate-400">
            Upload wire transfer documents for automated verification and compliance checking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-12 text-center transition-colors',
              isDragging
                ? 'border-blue-500 bg-blue-500/5'
                : 'border-slate-600 hover:border-slate-500 bg-slate-900/50'
            )}
          >
            <Upload className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-sm text-slate-400 mb-4">
              Accepts PDF, PNG, JPG, TIFF files
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.tiff"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700" asChild>
                <span>Browse Files</span>
              </Button>
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-400 uppercase">File Queue ({files.length})</p>
              <ScrollArea className="h-64 border border-slate-700 rounded-md bg-slate-900/50">
                <div className="p-4 space-y-2">
                  {files.map((uploadedFile) => (
                    <div
                      key={uploadedFile.id}
                      className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-md"
                    >
                      <FileIcon fileName={uploadedFile.file.name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {uploadedFile.file.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatFileSize(uploadedFile.file.size)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(uploadedFile.id)}
                        className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={onProcess}
            disabled={files.length === 0 || isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Process Wire Packet'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

// Component: Processing Screen
function ProcessingScreen({ currentStep, totalDocs }: { currentStep: number; totalDocs: number }) {
  const steps = [
    { name: 'Extracting', description: 'OCR and data extraction' },
    { name: 'Validating', description: 'Compliance rule checking' },
    { name: 'Complete', description: 'Finalizing results' }
  ]

  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl bg-slate-800 border-slate-700">
        <CardHeader className="text-center">
          <CardTitle className="text-white text-2xl">Processing Wire Packet</CardTitle>
          <CardDescription className="text-slate-400">
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
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-600 bg-slate-900'
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    ) : isActive ? (
                      <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    ) : (
                      <span className="text-slate-500">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={cn(
                        'font-medium',
                        isActive || isComplete ? 'text-white' : 'text-slate-500'
                      )}
                    >
                      {step.name}
                    </p>
                    <p className="text-sm text-slate-400">{step.description}</p>
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

// Component: Dashboard Screen
function DashboardScreen({
  result,
  onReset,
  clerkNotes,
  onClerkNotesChange
}: {
  result: WireVerificationResponse
  onReset: () => void
  clerkNotes: string
  onClerkNotesChange: (notes: string) => void
}) {
  // Add defensive checks for nested properties
  if (!result?.result?.validation_results || !result?.result?.extraction_results) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Loading Results...</CardTitle>
            <CardDescription className="text-slate-400">
              Please wait while we process the verification data
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const { validation_results, extraction_results, final_decision, processing_summary } = result.result

  const packetId = `WP-${new Date().getTime().toString().slice(-8)}`

  const overallStatusColor = {
    PASS: 'bg-emerald-500',
    FAIL: 'bg-red-500',
    FLAG: 'bg-amber-500'
  }[validation_results.overall_validation_status]

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top Navigation Bar */}
      <div className={cn('border-b border-slate-800', overallStatusColor)}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                New Packet
              </Button>
              <Separator orientation="vertical" className="h-6 bg-white/20" />
              <div>
                <p className="text-xs text-white/70">Packet ID</p>
                <p className="text-sm font-semibold text-white">{packetId}</p>
              </div>
            </div>
            <StatusBadge status={validation_results.overall_validation_status} />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400 text-xs">Documents</CardDescription>
                  <CardTitle className="text-white text-2xl">
                    {processing_summary.total_documents_processed}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400 text-xs">Extraction Confidence</CardDescription>
                  <CardTitle className="text-white text-2xl">
                    {(processing_summary.extraction_confidence * 100).toFixed(0)}%
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardDescription className="text-slate-400 text-xs">Critical Issues</CardDescription>
                  <CardTitle className="text-red-400 text-2xl">
                    {processing_summary.critical_issues_count}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Validation Summary */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Validation Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 uppercase mb-1">Total Rules</p>
                    <p className="text-2xl font-bold text-white">
                      {validation_results.validation_summary.total_rules_checked}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase mb-1">Passed</p>
                    <p className="text-2xl font-bold text-emerald-500">
                      {validation_results.validation_summary.passed}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase mb-1">Failed</p>
                    <p className="text-2xl font-bold text-red-500">
                      {validation_results.validation_summary.failed}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase mb-1">Flagged</p>
                    <p className="text-2xl font-bold text-amber-500">
                      {validation_results.validation_summary.flagged}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Validation Rules */}
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-white">Validation Rules</h2>
              {validation_results.validation_rules.map((rule, index) => (
                <ValidationRuleCard key={index} rule={rule} />
              ))}
            </div>

            {/* Compliance Checks */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Compliance Checks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-700 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-white">Signature Requirements</p>
                    <p className="text-xs text-slate-400">
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
                <div className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-700 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-white">Amount Limits</p>
                    <p className="text-xs text-slate-400">
                      Transfer: ${validation_results.compliance_checks.amount_limits.transfer_amount.toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge
                    status={validation_results.compliance_checks.amount_limits.status as 'PASS' | 'FAIL' | 'FLAG'}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-700 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-white">Account Verification</p>
                    <p className="text-xs text-slate-400">
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
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {validation_results.recommendations.map((rec, index) => (
                      <li key={index} className="flex gap-2 text-sm text-slate-300">
                        <span className="text-blue-400 flex-shrink-0">{index + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Final Decision */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Final Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-700 rounded-md">
                  <span className="text-sm font-medium text-white">Approved</span>
                  <span className={cn('text-sm font-bold', final_decision.approved ? 'text-emerald-500' : 'text-red-500')}>
                    {final_decision.approved ? 'YES' : 'NO'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-700 rounded-md">
                  <span className="text-sm font-medium text-white">Manual Review</span>
                  <span className={cn('text-sm font-bold', final_decision.requires_manual_review ? 'text-amber-500' : 'text-emerald-500')}>
                    {final_decision.requires_manual_review ? 'REQUIRED' : 'NOT REQUIRED'}
                  </span>
                </div>

                {final_decision.blocking_issues.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-red-400 uppercase">Blocking Issues</p>
                    <ul className="space-y-1.5">
                      {final_decision.blocking_issues.map((issue, index) => (
                        <li key={index} className="flex gap-2 text-xs text-slate-300">
                          <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {final_decision.warnings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-amber-400 uppercase">Warnings</p>
                    <ul className="space-y-1.5">
                      {final_decision.warnings.map((warning, index) => (
                        <li key={index} className="flex gap-2 text-xs text-slate-300">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Extracted Documents */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Extracted Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3 pr-4">
                    {extraction_results.extracted_data.map((doc, index) => (
                      <div key={index} className="p-3 bg-slate-900/50 border border-slate-700 rounded-md">
                        <div className="flex items-start gap-2 mb-2">
                          <FileIcon fileName={doc.file_name} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{doc.file_name}</p>
                            <p className="text-xs text-slate-400 capitalize">
                              {doc.document_type.replace(/_/g, ' ')}
                            </p>
                          </div>
                        </div>

                        <Separator className="bg-slate-700 my-2" />

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Clarity</span>
                            <span className="text-white">
                              {(doc.document_quality.clarity * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Completeness</span>
                            <span className="text-white">
                              {(doc.document_quality.completeness * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Signatures</span>
                            <span className="text-white">{doc.signature_detection.signatures_found}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Clerk Notes */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Clerk Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={clerkNotes}
                  onChange={(e) => onClerkNotesChange(e.target.value)}
                  placeholder="Add any additional notes or observations..."
                  className="min-h-32 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
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
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                size="lg"
              >
                Return for Correction
              </Button>
            </div>
          </div>
        </div>

        {/* Extracted Data Table (at bottom) */}
        <Card className="mt-6 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Extracted Data Details</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/50">
                    <TableHead className="text-slate-300">Document</TableHead>
                    <TableHead className="text-slate-300">Account</TableHead>
                    <TableHead className="text-slate-300">Routing</TableHead>
                    <TableHead className="text-slate-300">Amount</TableHead>
                    <TableHead className="text-slate-300">Beneficiary</TableHead>
                    <TableHead className="text-slate-300">Originator</TableHead>
                    <TableHead className="text-slate-300">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extraction_results.extracted_data.map((doc, index) => (
                    <TableRow key={index} className="border-slate-700 hover:bg-slate-700/50">
                      <TableCell className="text-white font-medium">{doc.file_name}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-sm text-white">{doc.extracted_data.account_number.value || '-'}</p>
                          {doc.extracted_data.account_number.confidence > 0 && (
                            <p className="text-xs text-slate-400">
                              {(doc.extracted_data.account_number.confidence * 100).toFixed(0)}% conf
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-sm text-white">{doc.extracted_data.routing_number.value || '-'}</p>
                          {doc.extracted_data.routing_number.confidence > 0 && (
                            <p className="text-xs text-slate-400">
                              {(doc.extracted_data.routing_number.confidence * 100).toFixed(0)}% conf
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-sm text-white">
                            {doc.extracted_data.transfer_amount.value
                              ? `$${Number(doc.extracted_data.transfer_amount.value).toLocaleString()}`
                              : '-'}
                          </p>
                          {doc.extracted_data.transfer_amount.confidence > 0 && (
                            <p className="text-xs text-slate-400">
                              {(doc.extracted_data.transfer_amount.confidence * 100).toFixed(0)}% conf
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-sm text-white">{doc.extracted_data.beneficiary_name.value || '-'}</p>
                          {doc.extracted_data.beneficiary_name.confidence > 0 && (
                            <p className="text-xs text-slate-400">
                              {(doc.extracted_data.beneficiary_name.confidence * 100).toFixed(0)}% conf
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-sm text-white">{doc.extracted_data.originator_name.value || '-'}</p>
                          {doc.extracted_data.originator_name.confidence > 0 && (
                            <p className="text-xs text-slate-400">
                              {(doc.extracted_data.originator_name.confidence * 100).toFixed(0)}% conf
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-sm text-white">{doc.extracted_data.date.value || '-'}</p>
                          {doc.extracted_data.date.confidence > 0 && (
                            <p className="text-xs text-slate-400">
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
    </div>
  )
}

// Main Home Component
export default function Home() {
  const [screen, setScreen] = useState<Screen>('upload')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [processingStep, setProcessingStep] = useState(0)
  const [result, setResult] = useState<WireVerificationResponse | null>(null)
  const [clerkNotes, setClerkNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleProcess = async () => {
    setError(null)
    setScreen('processing')
    setProcessingStep(0)

    // Simulate processing steps with real agent call
    const simulateSteps = async () => {
      // Step 1: Extracting
      setProcessingStep(0)
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Step 2: Validating
      setProcessingStep(1)
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Step 3: Complete
      setProcessingStep(2)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    try {
      // Run simulation alongside the actual agent call
      const simulationPromise = simulateSteps()

      // Create message with file information
      const fileList = files.map(f => f.file.name).join(', ')
      const message = `Process wire packet with ${files.length} documents: ${fileList}. Wire amount: $250,000 to account 9876543210.`

      // Call the Wire Verification Manager agent
      const response = await callAIAgent(message, WIRE_VERIFICATION_MANAGER_AGENT_ID)

      // Wait for simulation to complete
      await simulationPromise

      if (response.success && response.response.status === 'success') {
        setResult(response.response as WireVerificationResponse)
        setScreen('dashboard')
      } else {
        setError(response.error || 'Processing failed')
        setScreen('upload')
      }
    } catch (err) {
      setError('Network error occurred')
      setScreen('upload')
    }
  }

  const handleReset = () => {
    setScreen('upload')
    setFiles([])
    setResult(null)
    setClerkNotes('')
    setError(null)
  }

  if (screen === 'upload') {
    return (
      <>
        <UploadScreen
          files={files}
          onFilesChange={setFiles}
          onProcess={handleProcess}
          isProcessing={false}
        />
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-md shadow-lg">
            {error}
          </div>
        )}
      </>
    )
  }

  if (screen === 'processing') {
    return <ProcessingScreen currentStep={processingStep} totalDocs={files.length} />
  }

  if (screen === 'dashboard' && result) {
    return (
      <DashboardScreen
        result={result}
        onReset={handleReset}
        clerkNotes={clerkNotes}
        onClerkNotesChange={setClerkNotes}
      />
    )
  }

  return null
}
