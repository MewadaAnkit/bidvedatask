import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import { RFQ } from '../types';
import {
  Plus,
  Trash2,
  Calendar,
  Layers,
  ArrowLeft,
  ArrowRight,
  Check,
  DollarSign,
  MapPin,
  Save,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface FormValues {
  title: string;
  description: string;
  category: string;
  deliveryLocation: string;
  budget?: number | null;
  deadline: string;
  lineItems: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
}

export const RFQCreateEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = React.useState<1 | 2>(1);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    mode: 'onTouched',
    defaultValues: {
      title: '',
      description: '',
      category: 'Machinery',
      deliveryLocation: '',
      budget: null,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      lineItems: [{ name: '', quantity: 100, unit: 'PCS' }],
    },
  });

  const watchedValues = watch();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  });

  // Fetch RFQ data if editing
  const { data: existingData, isLoading: isFetching } = useQuery({
    queryKey: ['rfq', id],
    queryFn: () => api.get<{ data: RFQ }>(`/api/rfqs/${id}`),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingData?.data) {
      const rfq = existingData.data;
      reset({
        title: rfq.title,
        description: rfq.description,
        category: rfq.category,
        deliveryLocation: rfq.deliveryLocation,
        budget: rfq.budget ? Number(rfq.budget) : null,
        deadline: new Date(rfq.deadline).toISOString().slice(0, 16),
        lineItems: rfq.lineItems.map((li) => ({
          name: li.name,
          quantity: Number(li.quantity),
          unit: li.unit,
        })),
      });
    }
  }, [existingData, reset]);

  const handleGoToStep2 = async () => {
    setServerError(null);
    const isValid = await trigger(
      ['title', 'description', 'category', 'deadline', 'deliveryLocation'],
      { shouldFocus: true }
    );
    if (isValid) {
      setCurrentStep(2);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    const payload = {
      ...values,
      budget: values.budget ? Number(values.budget) : null,
      deadline: new Date(values.deadline).toISOString(),
      lineItems: values.lineItems.map((item) => ({
        name: item.name.trim(),
        quantity: Number(item.quantity),
        unit: item.unit.trim(),
      })),
    };

    try {
      if (isEditing) {
        await api.put(`/api/rfqs/${id}`, payload);
        navigate(`/rfqs/${id}`);
      } else {
        const res = await api.post<{ data: RFQ }>('/api/rfqs', payload);
        navigate(`/rfqs/${res.data.id}`);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('An error occurred while saving the RFQ.');
      }
    }
  };

  if (isEditing && isFetching) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
        <p className="text-sm">Loading draft RFQ details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Top Header & Stepper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <Link
            to="/rfqs"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to RFQs</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {isEditing ? 'Edit Draft RFQ' : 'Create Request For Quotation'}
          </h1>
        </div>

        {/* 2-Step Stepper Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all ${
              currentStep === 1
                ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                currentStep === 1
                  ? 'bg-indigo-600 text-white'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {currentStep === 2 ? <Check className="w-3.5 h-3.5" /> : '1'}
            </div>
            <span>1. RFQ Details</span>
          </button>

          <span className="text-slate-300">→</span>

          <button
            type="button"
            onClick={handleGoToStep2}
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all ${
              currentStep === 2
                ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                currentStep === 2
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              2
            </div>
            <span>2. Line Items</span>
          </button>
        </div>
      </div>

      {serverError && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Step 1: RFQ Details & Delivery with Generic/Standard Field Sizes */}
        {currentStep === 1 && (
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Title, Category, Budget, Deadline */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    RFQ Title *
                  </label>
                  <input
                    type="text"
                    {...register('title', {
                      required: 'RFQ Title is required',
                      minLength: { value: 3, message: 'Title must be at least 3 characters' },
                    })}
                    placeholder="e.g. Industrial Ball Bearings & Bushings"
                    className={`w-full h-10 px-3.5 rounded-lg bg-white border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 shadow-xs transition-colors ${
                      errors.title
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20'
                    }`}
                  />
                  {errors.title && (
                    <p className="flex items-center gap-1 text-rose-600 text-xs font-medium mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{errors.title.message}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-slate-400" />
                      Category *
                    </label>
                    <input
                      type="text"
                      {...register('category', {
                        required: 'Category is required',
                        minLength: { value: 2, message: 'Category is required' },
                      })}
                      placeholder="e.g. Machinery"
                      className={`w-full h-10 px-3.5 rounded-lg bg-white border text-sm text-slate-900 focus:outline-none focus:ring-2 shadow-xs transition-colors ${
                        errors.category
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                          : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20'
                      }`}
                    />
                    {errors.category && (
                      <p className="flex items-center gap-1 text-rose-600 text-xs font-medium mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errors.category.message}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      Budget ₹ (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('budget', { valueAsNumber: true })}
                      placeholder="Estimated ₹"
                      className="w-full h-10 px-3.5 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                    />
                    {errors.budget && (
                      <p className="flex items-center gap-1 text-rose-600 text-xs font-medium mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errors.budget.message}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Submission Deadline *
                  </label>
                  <input
                    type="datetime-local"
                    {...register('deadline', { required: 'Submission deadline is required' })}
                    className={`w-full h-10 px-3.5 rounded-lg bg-white border text-sm text-slate-900 focus:outline-none focus:ring-2 shadow-xs transition-colors ${
                      errors.deadline
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20'
                    }`}
                  />
                  {errors.deadline && (
                    <p className="flex items-center gap-1 text-rose-600 text-xs font-medium mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{errors.deadline.message}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column: Scope & Delivery Address */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Scope of Supply & Specifications *
                  </label>
                  <textarea
                    rows={3}
                    {...register('description', {
                      required: 'Scope of supply / description is required',
                      minLength: { value: 2, message: 'Description must be at least 2 characters' },
                    })}
                    placeholder="Technical specifications, standards, and delivery conditions..."
                    className={`w-full p-3 rounded-lg bg-white border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 shadow-xs transition-colors resize-y ${
                      errors.description
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20'
                    }`}
                  />
                  {errors.description && (
                    <p className="flex items-center gap-1 text-rose-600 text-xs font-medium mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{errors.description.message}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    Delivery Location & Shipping Address *
                  </label>
                  <textarea
                    rows={3}
                    {...register('deliveryLocation', {
                      required: 'Delivery location is required',
                      minLength: { value: 2, message: 'Delivery location must be at least 2 characters' },
                      maxLength: { value: 500, message: 'Max 500 characters' },
                    })}
                    placeholder="Warehouse address, plot no, street, city, state & pin code..."
                    className={`w-full p-3 rounded-lg bg-white border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 shadow-xs transition-colors resize-y ${
                      errors.deliveryLocation
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20'
                    }`}
                  />
                  {errors.deliveryLocation && (
                    <p className="flex items-center gap-1 text-rose-600 text-xs font-medium mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{errors.deliveryLocation.message}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Step 1 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Link
                to="/rfqs"
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </Link>

              <button
                type="button"
                onClick={handleGoToStep2}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer"
              >
                <span>Continue to Line Items</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Line Items & Final Submission */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {/* Context Summary from Step 1 */}
            <div className="p-3.5 px-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                <span className="font-semibold text-slate-900 truncate">
                  {watchedValues.title || 'Untitled RFQ'}
                </span>
                <span className="text-xs text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
                  {watchedValues.category || 'General'}
                </span>
                <span
                  className="text-slate-600 flex items-center gap-1 truncate max-w-sm text-xs"
                  title={watchedValues.deliveryLocation}
                >
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{watchedValues.deliveryLocation || 'Location not set'}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline shrink-0"
              >
                Edit Step 1 Details
              </button>
            </div>

            {/* Line Items Card */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-500" />
                    Required Line Items
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Specify all parts, components or services vendors need to quote
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => append({ name: '', quantity: 100, unit: 'PCS' })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <span className="text-xs font-mono font-medium text-slate-400 w-6 text-center">
                      #{idx + 1}
                    </span>

                    <div className="flex-1">
                      <input
                        type="text"
                        {...register(`lineItems.${idx}.name` as const, {
                          required: 'Item name is required',
                        })}
                        placeholder="Item name or description"
                        className="w-full h-10 px-3.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                      />
                    </div>

                    <div className="w-32">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        {...register(`lineItems.${idx}.quantity` as const, {
                          required: true,
                          valueAsNumber: true,
                        })}
                        placeholder="Quantity"
                        className="w-full h-10 px-3.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono shadow-xs"
                      />
                    </div>

                    <div className="w-28">
                      <input
                        type="text"
                        {...register(`lineItems.${idx}.unit` as const, { required: true })}
                        placeholder="Unit (PCS)"
                        className="w-full h-10 px-3.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                      />
                    </div>

                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2 Actions */}
            <div className="flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Details</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving RFQ...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isEditing ? 'Save Changes' : 'Save as Draft'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default RFQCreateEditPage;
