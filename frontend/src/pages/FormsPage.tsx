/**
 * Forms Management Page - Custom Form Builder and Submissions
 */
import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Description as FormIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  RemoveCircle as RemoveIcon,
  DragIndicator as DragIcon,
} from "@mui/icons-material";
import SignatureCanvas from "react-signature-canvas";
// @ts-ignore - signature canvas types
import {
  formsApi,
  FormTemplate,
  FormFieldDefinition,
  FormSubmission,
} from "../services/apiService";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const fieldTypes = [
  { value: "text", label: "Text Input" },
  { value: "number", label: "Number Input" },
  { value: "checkbox", label: "Checkbox" },
  { value: "textarea", label: "Text Area" },
  { value: "select", label: "Dropdown Select" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date & Time" },
  { value: "signature", label: "Signature" },
  { value: "drug_security_tag", label: "Drug Security Tag" },
];

export default function FormsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Template builder state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(
    null
  );
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    category: "",
    requires_signature: false,
  });
  const [fields, setFields] = useState<FormFieldDefinition[]>([]);
  const [currentField, setCurrentField] = useState<
    Partial<FormFieldDefinition>
  >({
    id: "",
    type: "text",
    label: "",
    required: false,
    placeholder: "",
    options: [],
  });

  // Form submission state
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(
    null
  );
  const [submissionData, setSubmissionData] = useState<Record<string, any>>({});
  const sigPadRef = useRef<SignatureCanvas>(null);

  // View submission state
  const [viewSubmissionOpen, setViewSubmissionOpen] = useState(false);
  const [viewingSubmission, setViewingSubmission] =
    useState<FormSubmission | null>(null);

  useEffect(() => {
    fetchTemplates();
    fetchSubmissions();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await formsApi.listTemplates({ limit: 500 });
      setTemplates(response.data);
    } catch (err: any) {
      console.error("Error fetching templates:", err);
      setError(err.response?.data?.detail || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await formsApi.listSubmissions({ limit: 500 });
      setSubmissions(response.data);
    } catch (err: any) {
      console.error("Error fetching submissions:", err);
    }
  };

  // ========== TEMPLATE BUILDER ==========

  const handleAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: "",
      description: "",
      category: "",
      requires_signature: false,
    });
    setFields([]);
    setTemplateDialogOpen(true);
  };

  const handleEditTemplate = (template: FormTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || "",
      category: template.category || "",
      requires_signature: template.requires_signature,
    });
    setFields(template.fields);
    setTemplateDialogOpen(true);
  };

  const handleAddField = () => {
    if (!currentField.label) {
      setError("Field label is required");
      return;
    }

    const newField: FormFieldDefinition = {
      id: `field_${Date.now()}`,
      type: currentField.type || "text",
      label: currentField.label,
      required: currentField.required || false,
      placeholder: currentField.placeholder,
      options: currentField.options,
      help_text: currentField.help_text,
    };

    const updatedFields = [...fields, newField];
    setFields(updatedFields);
    setCurrentField({
      id: "",
      type: "text",
      label: "",
      required: false,
      placeholder: "",
      options: [],
      help_text: "",
    });
    setError(null); // Clear any errors
    console.log("Field added:", newField);
    console.log("Total fields:", updatedFields.length);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSaveTemplate = async () => {
    try {
      if (!templateForm.name) {
        setError("Template name is required");
        return;
      }

      if (fields.length === 0) {
        setError("At least one field is required");
        return;
      }

      console.log("Saving template with fields:", fields);
      console.log("Template form data:", templateForm);

      const data = {
        ...templateForm,
        fields,
        is_active: true,
      };

      console.log("Sending to API:", data);

      if (editingTemplate) {
        const response = await formsApi.updateTemplate(
          editingTemplate.id,
          data
        );
        console.log("Update response:", response);
      } else {
        const response = await formsApi.createTemplate(data);
        console.log("Create response:", response);
      }

      setTemplateDialogOpen(false);
      fetchTemplates();
      setError(null);
    } catch (err: any) {
      console.error("Error saving template:", err);
      console.error("Error response:", err.response?.data);
      setError(err.response?.data?.detail || "Failed to save template");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this form template?")) return;

    try {
      await formsApi.deleteTemplate(id);
      fetchTemplates();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete template");
    }
  };

  // ========== FORM SUBMISSION ==========

  const handleFillForm = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setSubmissionData({});
    setSubmissionDialogOpen(true);
  };

  const handleSubmitForm = async () => {
    try {
      if (!selectedTemplate) return;

      // Validate required fields
      for (const field of selectedTemplate.fields) {
        if (field.required && !submissionData[field.id]) {
          setError(`${field.label} is required`);
          return;
        }
      }

      let signature = undefined;
      if (selectedTemplate.requires_signature && sigPadRef.current) {
        if (sigPadRef.current.isEmpty()) {
          setError("Signature is required");
          return;
        }
        signature = sigPadRef.current.toDataURL();
      }

      const data = {
        template_id: selectedTemplate.id,
        data: submissionData,
        signature,
        signature_name: submissionData._signature_name || undefined,
      };

      await formsApi.createSubmission(data);
      setSubmissionDialogOpen(false);
      fetchSubmissions();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to submit form");
    }
  };

  const handleViewSubmission = (submission: FormSubmission) => {
    setViewingSubmission(submission);
    setViewSubmissionOpen(true);
  };

  const handleReviewSubmission = async (id: string, status: string) => {
    try {
      await formsApi.reviewSubmission(id, status);
      fetchSubmissions();
      setViewSubmissionOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to review submission");
    }
  };

  const renderFormField = (field: FormFieldDefinition) => {
    switch (field.type) {
      case "text":
        return (
          <TextField
            fullWidth
            label={field.label}
            placeholder={field.placeholder}
            required={field.required}
            value={submissionData[field.id] || ""}
            onChange={(e) =>
              setSubmissionData({
                ...submissionData,
                [field.id]: e.target.value,
              })
            }
            helperText={field.help_text}
          />
        );

      case "number":
      case "drug_security_tag":
        return (
          <TextField
            fullWidth
            type="number"
            label={field.label}
            placeholder={field.placeholder}
            required={field.required}
            value={submissionData[field.id] || ""}
            onChange={(e) =>
              setSubmissionData({
                ...submissionData,
                [field.id]: e.target.value,
              })
            }
            helperText={
              field.help_text ||
              (field.type === "drug_security_tag"
                ? "Enter security tag number"
                : "")
            }
          />
        );

      case "checkbox":
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={submissionData[field.id] || false}
                onChange={(e) =>
                  setSubmissionData({
                    ...submissionData,
                    [field.id]: e.target.checked,
                  })
                }
              />
            }
            label={field.label}
          />
        );

      case "textarea":
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            label={field.label}
            placeholder={field.placeholder}
            required={field.required}
            value={submissionData[field.id] || ""}
            onChange={(e) =>
              setSubmissionData({
                ...submissionData,
                [field.id]: e.target.value,
              })
            }
            helperText={field.help_text}
          />
        );

      case "select":
        return (
          <FormControl fullWidth required={field.required}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={submissionData[field.id] || ""}
              onChange={(e) =>
                setSubmissionData({
                  ...submissionData,
                  [field.id]: e.target.value,
                })
              }
              label={field.label}
            >
              {field.options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case "date":
        return (
          <TextField
            fullWidth
            type="date"
            label={field.label}
            required={field.required}
            value={submissionData[field.id] || ""}
            onChange={(e) =>
              setSubmissionData({
                ...submissionData,
                [field.id]: e.target.value,
              })
            }
            InputLabelProps={{ shrink: true }}
            helperText={field.help_text}
          />
        );

      case "datetime":
        return (
          <TextField
            fullWidth
            type="datetime-local"
            label={field.label}
            required={field.required}
            value={submissionData[field.id] || ""}
            onChange={(e) =>
              setSubmissionData({
                ...submissionData,
                [field.id]: e.target.value,
              })
            }
            InputLabelProps={{ shrink: true }}
            helperText={field.help_text}
          />
        );

      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "success";
      case "Rejected":
        return "error";
      case "Reviewed":
        return "info";
      case "Submitted":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          Forms Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            fetchTemplates();
            fetchSubmissions();
          }}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Form Templates" />
          <Tab label="Submissions" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddTemplate}
              >
                Create Form Template
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Name</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Category</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Fields</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Signature Required</strong>
                      </TableCell>
                      <TableCell align="center">
                        <strong>Actions</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {template.name}
                          </Typography>
                          {template.description && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {template.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{template.category || "—"}</TableCell>
                        <TableCell>{template.fields.length} fields</TableCell>
                        <TableCell>
                          {template.requires_signature ? "Yes" : "No"}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleFillForm(template)}
                            title="Fill Form"
                          >
                            <FormIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteTemplate(template.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ px: 3, pb: 3 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Form</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Submitted By</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Submitted At</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Status</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Actions</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>{submission.template_name}</TableCell>
                      <TableCell>
                        {submission.submitted_by_name || "—"}
                      </TableCell>
                      <TableCell>
                        {new Date(submission.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={submission.status}
                          color={getStatusColor(submission.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          onClick={() => handleViewSubmission(submission)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>
      </Paper>

      {/* Template Builder Dialog */}
      <Dialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingTemplate ? "Edit Form Template" : "Create Form Template"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Template Name"
                value={templateForm.name}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, name: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={templateForm.description}
                onChange={(e) =>
                  setTemplateForm({
                    ...templateForm,
                    description: e.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={templateForm.category}
                  onChange={(e) =>
                    setTemplateForm({
                      ...templateForm,
                      category: e.target.value,
                    })
                  }
                  label="Category"
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="Medication">Medication</MenuItem>
                  <MenuItem value="Inspection">Inspection</MenuItem>
                  <MenuItem value="Incident Report">Incident Report</MenuItem>
                  <MenuItem value="Maintenance">Maintenance</MenuItem>
                  <MenuItem value="Training">Training</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={templateForm.requires_signature}
                    onChange={(e) =>
                      setTemplateForm({
                        ...templateForm,
                        requires_signature: e.target.checked,
                      })
                    }
                  />
                }
                label="Requires Signature"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Form Fields</Typography>
              </Divider>
            </Grid>

            {/* Existing Fields */}
            <Grid item xs={12}>
              {fields.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ p: 2 }}
                >
                  No fields added yet. Add fields using the form below.
                </Typography>
              ) : (
                <List>
                  {fields.map((field, index) => (
                    <ListItem key={index}>
                      <DragIcon sx={{ mr: 1, color: "text.secondary" }} />
                      <ListItemText
                        primary={field.label}
                        secondary={`Type: ${field.type}${
                          field.required ? " (Required)" : ""
                        }`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveField(index)}
                        >
                          <RemoveIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ px: 2 }}
              >
                Total fields: {fields.length}
              </Typography>
            </Grid>

            {/* Add New Field */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Add New Field
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Field Type</InputLabel>
                        <Select
                          value={currentField.type}
                          onChange={(e) =>
                            setCurrentField({
                              ...currentField,
                              type: e.target.value,
                            })
                          }
                          label="Field Type"
                        >
                          {fieldTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Field Label"
                        value={currentField.label}
                        onChange={(e) =>
                          setCurrentField({
                            ...currentField,
                            label: e.target.value,
                          })
                        }
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Placeholder"
                        value={currentField.placeholder}
                        onChange={(e) =>
                          setCurrentField({
                            ...currentField,
                            placeholder: e.target.value,
                          })
                        }
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={currentField.required}
                            onChange={(e) =>
                              setCurrentField({
                                ...currentField,
                                required: e.target.checked,
                              })
                            }
                          />
                        }
                        label="Required"
                      />
                    </Grid>
                    {currentField.type === "select" && (
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Options (comma-separated)"
                          value={currentField.options?.join(", ") || ""}
                          onChange={(e) =>
                            setCurrentField({
                              ...currentField,
                              options: e.target.value
                                .split(",")
                                .map((o) => o.trim()),
                            })
                          }
                          helperText="e.g., Option 1, Option 2, Option 3"
                        />
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleAddField}
                        fullWidth
                      >
                        Add Field
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveTemplate} variant="contained">
            Save Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Form Submission Dialog */}
      <Dialog
        open={submissionDialogOpen}
        onClose={() => setSubmissionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{selectedTemplate?.name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {selectedTemplate?.fields.map((field) => (
              <Grid item xs={12} key={field.id}>
                {renderFormField(field)}
              </Grid>
            ))}

            {selectedTemplate?.requires_signature && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Name (for signature)"
                    value={submissionData._signature_name || ""}
                    onChange={(e) =>
                      setSubmissionData({
                        ...submissionData,
                        _signature_name: e.target.value,
                      })
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Signature *
                  </Typography>
                  <Box
                    sx={{
                      border: "1px solid #ccc",
                      borderRadius: 1,
                      overflow: "hidden",
                    }}
                  >
                    <SignatureCanvas
                      ref={sigPadRef}
                      canvasProps={{
                        width: 500,
                        height: 200,
                        style: { width: "100%", height: "200px" },
                      }}
                    />
                  </Box>
                  <Button
                    size="small"
                    onClick={() => sigPadRef.current?.clear()}
                    sx={{ mt: 1 }}
                  >
                    Clear Signature
                  </Button>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmissionDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmitForm} variant="contained">
            Submit Form
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Submission Dialog */}
      <Dialog
        open={viewSubmissionOpen}
        onClose={() => setViewSubmissionOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Form Submission Details</DialogTitle>
        <DialogContent>
          {viewingSubmission && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Form: {viewingSubmission.template_name}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Submitted By: {viewingSubmission.submitted_by_name}
              </Typography>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Submitted At:{" "}
                {new Date(viewingSubmission.created_at).toLocaleString()}
              </Typography>

              <Divider sx={{ my: 2 }} />

              {Object.entries(viewingSubmission.data).map(([key, value]) => (
                <Box key={key} sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="medium">
                    {key}:
                  </Typography>
                  <Typography variant="body2">
                    {typeof value === "boolean"
                      ? value
                        ? "Yes"
                        : "No"
                      : value}
                  </Typography>
                </Box>
              ))}

              {viewingSubmission.signature && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight="medium">
                    Signature:
                  </Typography>
                  <img
                    src={viewingSubmission.signature}
                    alt="Signature"
                    style={{ maxWidth: "100%", border: "1px solid #ccc" }}
                  />
                  <Typography variant="caption" display="block">
                    Signed by: {viewingSubmission.signature_name}
                  </Typography>
                </Box>
              )}

              <Chip
                label={viewingSubmission.status}
                color={getStatusColor(viewingSubmission.status) as any}
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {viewingSubmission?.status === "Submitted" && (
            <>
              <Button
                onClick={() =>
                  handleReviewSubmission(viewingSubmission.id, "Approved")
                }
                color="success"
                startIcon={<ApproveIcon />}
              >
                Approve
              </Button>
              <Button
                onClick={() =>
                  handleReviewSubmission(viewingSubmission.id, "Rejected")
                }
                color="error"
                startIcon={<RejectIcon />}
              >
                Reject
              </Button>
            </>
          )}
          <Button onClick={() => setViewSubmissionOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
