import { useCallback, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Camera, CheckCircle2, Loader2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/api/student.api';
import {
  formatFileSize,
  getCroppedAvatarBlob,
  getInitials,
  MAX_AVATAR_BYTES,
  resolveAvatarUrl,
} from '@/utils/avatar';
import { cn } from '@/lib/utils';

/**
 * @param {{
 *   user: { name?: string, avatarUrl?: string | null } | null;
 *   onUserUpdate: (user: unknown) => void;
 *   className?: string;
 * }} props
 */
export function ProfileAvatarUpload({ user, onUserUpdate, className }) {
  const inputRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);

  const avatarUrl = resolveAvatarUrl(user?.avatarUrl);
  const displayUrl = previewUrl ?? avatarUrl;
  const initials = getInitials(user?.name);

  const resetCropState = useCallback(() => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, []);

  const onCropComplete = useCallback((_croppedArea, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const onSelectFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Only JPG and PNG images are supported');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Choose a photo smaller than 5 MB before cropping');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(String(reader.result));
      setPhase('cropping');
    };
    reader.onerror = () => toast.error('Could not read the selected image');
    reader.readAsDataURL(file);
  };

  const handleCancelCrop = () => {
    resetCropState();
    setPhase('idle');
  };

  const handleConfirmCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setPhase('uploading');
    setProgress(8);

    try {
      const blob = await getCroppedAvatarBlob(imageSrc, croppedAreaPixels, MAX_AVATAR_BYTES);
      setProgress(25);

      const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' });
      const { data } = await authApi.uploadAvatar(file, (value) => {
        setProgress(Math.max(25, value));
      });

      const nextUser = data.data.user;
      onUserUpdate(nextUser);
      setPreviewUrl(resolveAvatarUrl(nextUser.avatarUrl));
      setProgress(100);
      setPhase('done');
      toast.success('Profile photo updated');

      window.setTimeout(() => {
        resetCropState();
        setPhase('idle');
        setProgress(0);
      }, 1400);
    } catch (err) {
      toast.error(err.message || 'Could not upload profile photo');
      setPhase('cropping');
      setProgress(0);
    }
  };

  const handleRemove = async () => {
    if (!avatarUrl) return;

    setPhase('uploading');
    setProgress(40);

    try {
      const { data } = await authApi.removeAvatar();
      onUserUpdate(data.data.user);
      setPreviewUrl(null);
      setProgress(100);
      setPhase('done');
      toast.success('Profile photo removed');

      window.setTimeout(() => {
        setPhase('idle');
        setProgress(0);
      }, 1200);
    } catch (err) {
      toast.error(err.message || 'Could not remove profile photo');
      setPhase('idle');
      setProgress(0);
    }
  };

  return (
    <>
      <div className={cn('flex flex-col items-start gap-3 sm:flex-row sm:items-center', className)}>
        <div className="relative">
          <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-[#E2EEE8] bg-gradient-to-br from-[#0A6640] to-[#10B981] shadow-[0_1px_2px_rgba(10,102,64,0.04)]">
            {displayUrl ? (
              <img src={displayUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-bold text-white">
                {initials}
              </div>
            )}

            {phase === 'uploading' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#052E1C]/70 px-2 text-white">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="mt-1 text-[10px] font-semibold">{progress}%</span>
              </div>
            ) : null}

            {phase === 'done' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0A6640]/85 text-white">
                <CheckCircle2 className="h-8 w-8" />
              </div>
            ) : null}
          </div>

          {phase === 'uploading' ? (
            <div className="absolute -bottom-2 left-0 right-0 h-1.5 overflow-hidden rounded-full bg-[#E2EEE8]">
              <div
                className="h-full rounded-full bg-[#10B981] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}
        </div>

        <div className="min-w-0 space-y-2">
          <div>
            <p className="text-sm font-semibold text-[#052E1C]">Profile photo</p>
            <p className="text-xs text-[#6B7280]">
              JPG or PNG, max {formatFileSize(MAX_AVATAR_BYTES)} after cropping.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={phase === 'uploading'}
              onClick={() => inputRef.current?.click()}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[#C4E8D4] bg-white px-4 text-xs font-semibold text-[#0A6640] transition-colors hover:bg-[#E6F7EF] disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
              {avatarUrl ? 'Change photo' : 'Upload photo'}
            </button>

            {avatarUrl ? (
              <button
                type="button"
                disabled={phase === 'uploading'}
                onClick={handleRemove}
                className="inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-semibold text-[#B91C1C] transition-colors hover:bg-[#FEE2E2] disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            ) : null}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={onSelectFile}
        />
      </div>

      {phase === 'cropping' && imageSrc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#052E1C]/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#E2EEE8] bg-white shadow-[0_8px_32px_rgba(10,102,64,0.12)]">
            <div className="flex items-center justify-between border-b border-[#E2EEE8] px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-[#052E1C]">Crop profile photo</h3>
                <p className="text-xs text-[#6B7280]">Drag to reposition. Final image must be under 500 KB.</p>
              </div>
              <button
                type="button"
                onClick={handleCancelCrop}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#4B6358] transition-colors hover:bg-[#E6F7EF]"
                aria-label="Close cropper"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative h-72 bg-[#F4FAF7]">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <label htmlFor="avatar-zoom" className="mb-1 block text-xs font-medium text-[#4B6358]">
                  Zoom
                </label>
                <input
                  id="avatar-zoom"
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="w-full accent-[#0A6640]"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCancelCrop}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#C4E8D4] px-4 text-sm font-semibold text-[#0A6640]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCrop}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0A6640] px-4 text-sm font-semibold text-white hover:bg-[#084F31]"
                >
                  Save photo
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
