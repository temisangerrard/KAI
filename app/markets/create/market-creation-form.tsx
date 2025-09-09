"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

import { format } from "date-fns"
import { CalendarIcon, PlusCircle, X, AlertCircle, Sparkles, Eye, Save, FileText, Wand2, Check, Heart, Trophy, Shirt, Music, Film, Users, List } from "lucide-react"
import { useAuth } from "../../auth/auth-context"
import { createMarket, saveMarketDraft, getMarketDrafts, generateAISuggestedTags } from "./market-service"
import { marketTemplates } from "./market-templates"
import { MarketCreationSuccess } from "../../components/market-creation-success"

// Define market categories
const marketCategories = [
  "Entertainment",
  "Fashion",
  "Music",
  "Celebrity",
  "TV Shows",
  "Movies",
  "Social Media",
  "Sports",
  "Politics",
  "Technology",
  "Other"
]

// Define option colors (expanded for multi-option support)
const optionColors = [
  { name: "Sage", value: "bg-kai-400" },
  { name: "Purple", value: "bg-primary-400" },
  { name: "Blue", value: "bg-blue-400" },
  { name: "Green", value: "bg-green-400" },
  { name: "Orange", value: "bg-orange-400" },
  { name: "Red", value: "bg-red-400" },
  { name: "Yellow", value: "bg-yellow-400" },
  { name: "Teal", value: "bg-teal-400" },
  { name: "Pink", value: "bg-pink-400" },
  { name: "Indigo", value: "bg-indigo-400" },
  { name: "Cyan", value: "bg-cyan-400" },
  { name: "Lime", value: "bg-lime-400" },
  { name: "Amber", value: "bg-amber-400" },
  { name: "Emerald", value: "bg-emerald-400" },
  { name: "Violet", value: "bg-violet-400" },
  { name: "Rose", value: "bg-rose-400" },
  { name: "Sky", value: "bg-sky-400" },
  { name: "Fuchsia", value: "bg-fuchsia-400" },
  { name: "Slate", value: "bg-slate-400" },
  { name: "Stone", value: "bg-stone-400" },
]

// Icon mapping for templates
const iconMap: Record<string, any> = {
  Check, Heart, Trophy, Shirt, Music, Film, Users, List, Sparkles
}

export function MarketCreationForm() {
  const { user, updateUser } = useAuth()
  const router = useRouter()

  // Form state
  const [currentStep, setCurrentStep] = useState(0) // Start at 0 for template selection
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [options, setOptions] = useState([
    { id: `option_initial_0_${Date.now()}`, name: "", color: "bg-kai-400" },
    { id: `option_initial_1_${Date.now() + 1}`, name: "", color: "bg-primary-400" }
  ])
  const [creatorRewardPercentage] = useState(5) // Fixed at 5% for now
  const [tags, setTags] = useState<string[]>([])
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<MarketTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [drafts, setDrafts] = useState<MarketDraft[]>([])
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)

  // Validation state
  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    category?: string;
    endDate?: string;
    options?: string;
  }>({})

  // Success state
  const [isSuccess, setIsSuccess] = useState(false)
  const [createdMarket, setCreatedMarket] = useState<any>(null)

  // Load drafts on component mount
  useEffect(() => {
    if (user) {
      const userDrafts = getMarketDrafts(user.id)
      setDrafts(userDrafts)
    }
  }, [user])

  // Auto-save draft functionality
  useEffect(() => {
    if (!user || !autoSaveEnabled || currentStep === 0) return

    const timeoutId = setTimeout(() => {
      saveDraft()
    }, 2000) // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId)
  }, [title, description, category, endDate, options, tags, user, autoSaveEnabled, currentStep])

  // Generate AI-suggested tags when title or description changes
  useEffect(() => {
    if (title.trim() || description.trim()) {
      const suggested = generateAISuggestedTags(title, description, category)
      setSuggestedTags(suggested.filter(tag => !tags.includes(tag)))
    }
  }, [title, description, category, tags])

  // Apply template when selected
  const applyTemplate = (template: MarketTemplate) => {
    setSelectedTemplate(template)
    setTitle("")
    setDescription("")
    setCategory(template.category)
    setOptions(template.options.map((option, index) => ({
      id: `option_template_${template.id}_${index}_${Date.now()}`, // Generate unique option ID
      name: option.name,
      color: option.color
    })))
    setCurrentStep(1)
  }

  // Save draft functionality
  const saveDraft = async (showFeedback: boolean = false) => {
    if (!user || !title.trim()) return

    try {
      const draft = await saveMarketDraft({
        title,
        description,
        category,
        options: options.map(opt => ({ name: opt.name, color: opt.color })),
        endDate,
        creatorId: user.id,
        tags
      })

      if (!currentDraftId) {
        setCurrentDraftId(draft.id)
      }

      // Update drafts list
      const updatedDrafts = getMarketDrafts(user.id)
      setDrafts(updatedDrafts)

      // Show feedback if requested
      if (showFeedback) {
        // Create a temporary success indicator
        const button = document.querySelector('[data-save-draft]') as HTMLButtonElement
        if (button) {
          const originalText = button.textContent
          button.textContent = 'Saved!'
          button.classList.add('bg-green-500', 'hover:bg-green-600')
          setTimeout(() => {
            button.textContent = originalText
            button.classList.remove('bg-green-500', 'hover:bg-green-600')
          }, 2000)
        }
      }
    } catch (error) {
      console.error('Failed to save draft:', error)
    }
  }

  // Load draft
  const loadDraft = (draft: MarketDraft) => {
    setTitle(draft.title)
    setDescription(draft.description)
    setCategory(draft.category)
    setEndDate(draft.endDate)
    setOptions(draft.options.map((option, index) => ({
      id: `option_draft_${draft.id}_${index}_${Date.now()}`, // Generate unique option ID
      name: option.name,
      color: option.color
    })))
    setTags(draft.tags || [])
    setCurrentDraftId(draft.id)
    setCurrentStep(1)
  }

  // Add tag
  const addTag = (tag: string) => {
    if (!tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag])
      setSuggestedTags(suggestedTags.filter(t => t !== tag))
    }
  }

  // Remove tag
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  // Add a new option (unlimited options support)
  const addOption = () => {
    if (options.length < 20) { // Reasonable limit for UI purposes
      const nextColor = optionColors[options.length % optionColors.length].value
      const optionId = `option_${Date.now()}_${options.length + 1}` // Generate unique option ID
      setOptions([...options, { id: optionId, name: "", color: nextColor }])
    }
  }

  // Remove an option
  const removeOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter(option => option.id !== id))
    }
  }

  // Update an option
  const updateOption = (id: string, name: string) => {
    setOptions(options.map(option =>
      option.id === id ? { ...option, name } : option
    ))
  }

  // Update an option color
  const updateOptionColor = (id: string, color: string) => {
    setOptions(options.map(option =>
      option.id === id ? { ...option, color } : option
    ))
  }

  // Validate the current step
  const validateStep = (step: number): boolean => {
    const newErrors: any = {}

    if (step === 1) {
      if (!title.trim()) newErrors.title = "Title is required"
      if (!description.trim()) newErrors.description = "Description is required"
      if (!category) newErrors.category = "Category is required"
      if (!endDate) newErrors.endDate = "End date is required"
      else if (endDate < new Date()) newErrors.endDate = "End date must be in the future"
    }

    if (step === 2) {
      const emptyOptions = options.some(option => !option.name.trim())
      if (emptyOptions) newErrors.options = "All options must have a name"

      const uniqueNames = new Set(options.map(o => o.name.trim().toLowerCase()))
      if (uniqueNames.size !== options.length) {
        newErrors.options = "All options must have unique names"
      }

      // Validate minimum options
      if (options.length < 2) {
        newErrors.options = "At least 2 options are required"
      }

      // Validate option IDs are unique
      const uniqueIds = new Set(options.map(o => o.id))
      if (uniqueIds.size !== options.length) {
        newErrors.options = "Internal error: Option IDs must be unique"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle next step
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  // Handle previous step
  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1)
  }

  // Handle form submission
  const handleSubmit = async () => {
    // Validate all steps before submitting
    if (!validateStep(1) || !validateStep(2)) return

    try {
      if (!user) return

      // Create the market
      const market = await createMarket({
        title,
        description,
        category,
        options: options.map(option => ({
          name: option.name,
          color: option.color
        })),
        endDate: endDate as Date,
        creatorId: user.id,
        creatorRewardPercentage,
        tags,
        draftId: currentDraftId || undefined
      })

      // Update user with the new market
      const updatedMarkets = [...(user.marketsCreated || []), market]
      updateUser({
        marketsCreated: updatedMarkets,
        stats: {
          ...(user.stats || {}),
          marketsCreated: updatedMarkets.length
        }
      })

      // Show success state
      setCreatedMarket(market)
      setIsSuccess(true)

      // Redirect after a delay
      setTimeout(() => {
        router.push("/markets")
      }, 3000)
    } catch (error) {
      console.error("Failed to create market:", error)
      setErrors({ ...errors, submit: "Failed to create market. Please try again." })
    }
  }

  // If success, show celebration
  if (isSuccess && createdMarket) {
    return (
      <MarketCreationSuccess
        title="Market Created!"
        message={`Your prediction market "${createdMarket.title}" has been created successfully.`}
        marketId={createdMarket.id}
        onClose={() => router.push("/markets")}
        onViewMarket={() => router.push(`/markets/${createdMarket.id}`)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 0 ? "bg-kai-600 text-white" : currentStep > 0 ? "bg-kai-600 text-white" : "bg-kai-100 text-kai-600"
            }`}>
            <FileText className="w-4 h-4" />
          </div>
          <div className={`h-1 w-6 ${currentStep >= 1 ? "bg-kai-600" : "bg-kai-100"
            }`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 1 ? "bg-kai-600 text-white" : currentStep > 1 ? "bg-kai-600 text-white" : "bg-kai-100 text-kai-600"
            }`}>
            1
          </div>
          <div className={`h-1 w-6 ${currentStep >= 2 ? "bg-kai-600" : "bg-kai-100"
            }`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 2 ? "bg-kai-600 text-white" : currentStep > 2 ? "bg-kai-600 text-white" : "bg-kai-100 text-kai-600"
            }`}>
            2
          </div>
          <div className={`h-1 w-6 ${currentStep >= 3 ? "bg-kai-600" : "bg-kai-100"
            }`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 3 ? "bg-kai-600 text-white" : "bg-kai-100 text-kai-600"
            }`}>
            <Eye className="w-4 h-4" />
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Step {currentStep + 1} of 4
        </div>
      </div>

      {/* Step 0: Template Selection */}
      {currentStep === 0 && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Choose a Template</h2>
            <p className="text-sm text-gray-600">Start with a template or create from scratch</p>
          </div>

          {/* Drafts Section */}
          {drafts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Save className="w-4 h-4" />
                Your Drafts
              </h3>
              <div className="grid gap-3">
                {drafts.map((draft) => (
                  <Card key={draft.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{draft.title || "Untitled Draft"}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Last updated: {format(new Date(draft.updatedAt), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadDraft(draft)}
                        >
                          Continue
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start from scratch option */}
            <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-dashed border-gray-300 hover:border-kai-300 hover:scale-105">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors hover:bg-kai-100">
                  <PlusCircle className="w-6 h-6 text-gray-500 hover:text-kai-600" />
                </div>
                <h3 className="font-medium text-gray-800 mb-2">Start from Scratch</h3>
                <p className="text-sm text-gray-600 mb-4">Create a custom prediction market</p>
                <Button
                  variant="outline"
                  className="w-full hover:bg-kai-50 hover:border-kai-300"
                  onClick={() => setCurrentStep(1)}
                >
                  Create Custom
                </Button>
              </CardContent>
            </Card>

            {/* Template options */}
            {marketTemplates.map((template) => {
              const IconComponent = iconMap[template.icon]
              return (
                <Card key={template.id} className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 group">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-kai-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-kai-200 transition-colors">
                      <IconComponent className="w-6 h-6 text-kai-600 group-hover:text-kai-700" />
                    </div>
                    <h3 className="font-medium text-gray-800 mb-2 group-hover:text-kai-700">{template.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    <div className="mb-4">
                      <Badge variant="secondary" className="text-xs bg-kai-50 text-kai-700">
                        {template.category}
                      </Badge>
                    </div>
                    <Button
                      className="w-full bg-gradient-to-r from-kai-600 to-gold-600 hover:from-kai-600 hover:to-gold-700 text-white shadow-md hover:shadow-lg transition-all"
                      onClick={() => applyTemplate(template)}
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Basic Information</h2>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Title</label>
            <Input
              placeholder="What's your prediction about?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={errors.title ? "border-red-300" : ""}
            />
            {errors.title && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.title}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <Textarea
              placeholder="Provide more details about your prediction..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`min-h-[100px] ${errors.description ? "border-red-300" : ""}`}
            />
            {errors.description && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className={errors.category ? "border-red-300" : ""}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {marketCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.category}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">End Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${!endDate ? "text-gray-400" : ""
                    } ${errors.endDate ? "border-red-300" : ""}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "Select end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.endDate && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.endDate}
              </p>
            )}
          </div>

          <Button
            className="w-full bg-gradient-to-r from-kai-600 to-gold-600 hover:from-kai-600 hover:to-gold-700 text-white"
            onClick={handleNextStep}
          >
            Next: Add Options
          </Button>
        </div>
      )}

      {/* Step 2: Prediction Options */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Prediction Options</h2>
          <p className="text-sm text-gray-600">
            Add at least 2 options for people to choose from.
          </p>

          {errors.options && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.options}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {options.map((option, index) => (
              <Card key={option.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0 rounded-full"
                            style={{ backgroundColor: option.color.replace('bg-', '') }}
                          >
                            <span className="sr-only">Choose color</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2">
                          <div className="grid grid-cols-4 gap-2">
                            {optionColors.map((color) => (
                              <Button
                                key={color.value}
                                variant="ghost"
                                size="sm"
                                className={`w-8 h-8 p-0 rounded-full ${color.value}`}
                                onClick={() => updateOptionColor(option.id, color.value)}
                              >
                                <span className="sr-only">{color.name}</span>
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option.name}
                      onChange={(e) => updateOption(option.id, e.target.value)}
                      className="flex-1"
                    />
                    {options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(option.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {options.length < 20 && (
            <Button
              variant="outline"
              className="w-full border-dashed border-gray-300 text-gray-500"
              onClick={addOption}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Add Another Option ({options.length}/20)
            </Button>
          )}

          <div className="bg-kai-50 rounded-lg p-4 mt-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-kai-600" />
              <h3 className="font-medium text-gray-800">Creator Reward</h3>
            </div>
            <p className="text-sm text-gray-600">
              You'll receive {creatorRewardPercentage}% of the tokens allocated to this market as a reward for creating it.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handlePrevStep}
            >
              Back
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleNextStep}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Preview Mode */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Preview Your Market</h2>
            <p className="text-sm text-gray-600">
              This is how your market will appear to other users. Make sure everything looks perfect!
            </p>
          </div>

          {/* Market Preview Card */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-gray-800 mb-2">
                    {title || "Your Market Title"}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mb-3">
                    {description || "Your market description will appear here..."}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {category || "Category"}
                    </Badge>
                    {tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Ends: {endDate ? format(endDate, "MMM d, yyyy") : "End date"}</span>
                    <span>•</span>
                    <span>0 participants</span>
                    <span>•</span>
                    <span>0 tokens</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-800">Prediction Options</h4>
                {options.map((option, index) => (
                  <div key={option.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-kai-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${option.color}`}></div>
                      <span className="font-medium text-gray-800">
                        {option.name || `Option ${index + 1}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">0%</span>
                      <Button size="sm" className="bg-gradient-to-r from-kai-600 to-gold-600 hover:from-kai-600 hover:to-gold-700 text-white">
                        Back This
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Creator Info */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Sparkles className="w-4 h-4 text-kai-600" />
                  <span>Created by {user?.displayName || "You"}</span>
                  <span>•</span>
                  <span>Creator earns {creatorRewardPercentage}% of tokens</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Suggested Tags */}
          {suggestedTags.length > 0 && (
            <Card className="border-kai-200 bg-gradient-to-r from-kai-50 to-kai-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wand2 className="w-4 h-4 text-kai-600" />
                  <h4 className="font-medium text-gray-800">AI Suggested Tags</h4>
                  <Badge variant="secondary" className="text-xs bg-kai-100 text-kai-700">
                    {suggestedTags.length} suggestions
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  Add relevant tags to help users discover your market
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.map((tag) => (
                    <Button
                      key={tag}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 hover:bg-kai-100 hover:border-kai-300 transition-colors"
                      onClick={() => addTag(tag)}
                    >
                      <PlusCircle className="w-3 h-3 mr-1" />
                      {tag}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handlePrevStep}
            >
              Back to Edit
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              data-save-draft
              onClick={() => saveDraft(true)}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-kai-600 to-gold-600 hover:from-kai-600 hover:to-gold-700 text-white"
              onClick={handleSubmit}
            >
              Create Market
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}