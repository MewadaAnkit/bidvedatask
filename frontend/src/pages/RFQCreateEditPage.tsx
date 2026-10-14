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
  DollarSign,
  MapPin,
  FileText,
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
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
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
        <p>Loading draft RFQ details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link
        to="/rfqs"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to RFQ List</span>
      </Link>

      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isEditing ? 'Edit Draft RFQ' : 'Create Request For Quotation (RFQ)'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Fill in requirements and line items. The RFQ will be saved in DRAFT mode until you publish it.
          </p>
        </div>
      </div>

      {serverError && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Core RFQ Details Card */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            Basic Requirements
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              RFQ Title *
            </label>
            <input
              type="text"
              {...register('title', { required: 'Title is required', minLength: 3 })}
              placeholder="e.g. Industrial Deep Groove Ball Bearings & Bushings"
              className="w-full px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm shadow-sm transition-colors"
            />
            {errors.title && <p className="text-rose-600 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Scope of Supply & Technical Requirements *
            </label>
            <textarea
              rows={4}
              {...register('description', { required: 'Description is required', minLength: 10 })}
              placeholder="Detail required material standards, tolerances, delivery conditions, and testing protocols..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm resize-none shadow-sm transition-colors"
            />
            {errors.description && <p className="text-rose-600 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                Category *
              </label>
              <input
                type="text"
                {...register('category', { required: 'Category is required' })}
                placeholder="Hardware, Electrical, etc."
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Delivery Location *
              </label>
              <input
                type="text"
                {...register('deliveryLocation', { required: 'Delivery location is required' })}
                placeholder="City, State"
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                Budget in INR (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('budget', { valueAsNumber: true })}
                placeholder="Estimated Budget ₹"
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Submission Deadline *
              </label>
              <input
                type="datetime-local"
                {...register('deadline', { required: 'Deadline is required' })}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Line Items Card */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                Line Items
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Vendors must price every line item individually.
              </p>
            </div>

            <button
              type="button"
              onClick={() => append({ name: '', quantity: 100, unit: 'PCS' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              <span>Add Line Item</span>
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200"
              >
                <span className="text-xs font-mono font-medium text-slate-400 w-5">
                  #{idx + 1}
                </span>

                <div className="flex-1">
                  <input
                    type="text"
                    {...register(`lineItems.${idx}.name` as const, { required: true })}
                    placeholder="Item Description / Specification"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                  />
                </div>

                <div className="w-28">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    {...register(`lineItems.${idx}.quantity` as const, { required: true, valueAsNumber: true })}
                    placeholder="Quantity"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono shadow-sm"
                  />
                </div>

                <div className="w-24">
                  <input
                    type="text"
                    {...register(`lineItems.${idx}.unit` as const, { required: true })}
                    placeholder="Unit (PCS)"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                  />
                </div>

                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
                    title="Remove Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            to="/rfqs"
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all disabled:opacity-50"
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
      </form>
    </div>
  );
};
