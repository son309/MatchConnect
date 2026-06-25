import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Heart,
  ImagePlus,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Star,
  ShieldCheck,
  ShieldQuestion,
  SlidersHorizontal,
  Tags,
  Trash2,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import { useDating } from "../../../context/DatingContext";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const MAX_DATING_PHOTOS = 6;
const AVATAR_IMAGE_SIZE = 640;
const DATING_IMAGE_SIZE = 1600;
const IMAGE_QUALITY = 0.82;

function compressImageFile(file, maxSize) {
  if (!file.type.startsWith("image/")) {
    return readFileAsDataUrl(file);
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);

      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to process image"));
    };

    image.src = objectUrl;
  });
}

function makePhotoItem(url, index = 0) {
  return {
    id: `${url}-${index}`,
    url,
    file: null,
    isNew: false,
  };
}

function getProfileCompletion({ authUser, formData, datingPhotos, previewUrl }) {
  const checks = [
    { label: "Avatar", done: Boolean(previewUrl || authUser?.profilePic) },
    { label: "Dating photos", done: datingPhotos.length > 0 },
    { label: "Full name", done: Boolean(formData.fullName.trim()) },
    { label: "Age", done: Boolean(formData.age) },
    { label: "Gender", done: Boolean(formData.gender) },
    { label: "City", done: Boolean(formData.city.trim()) },
    { label: "Intentions", done: Boolean(formData.intentions) },
    { label: "Bio", done: Boolean(formData.bio.trim()) },
    { label: "Interests", done: Boolean(formData.interestsText.trim()) },
  ];
  const completed = checks.filter((item) => item.done).length;

  return {
    checks,
    completed,
    percent: Math.round((completed / checks.length) * 100),
    missing: checks.filter((item) => !item.done).map((item) => item.label),
  };
}

export default function ProfileSettings() {
  const { authUser, isUpdatingProfile, updateProfile, setAuthUser, requestProfileVerification } = useAuth();
  const { isDatingActionLoading, updateDatingProfile } = useDating();

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    age: "",
    gender: "",
    interestedIn: "everyone",
    city: "",
    intentions: "",
    preferredMinAge: 18,
    preferredMaxAge: 60,
    preferredCity: "",
    preferredIntentions: "",
    bio: "",
    interestsText: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [datingPhotos, setDatingPhotos] = useState([]);
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const localPhotoUrlsRef = useRef([]);

  useEffect(() => {
    if (!authUser) return;

    const dating = authUser.datingProfile || {};
    setFormData({
      fullName: authUser.fullName || "",
      phone: authUser.phone || "",
      age: dating.age || "",
      gender: dating.gender || "",
      interestedIn: dating.interestedIn || "everyone",
      city: dating.city || "",
      intentions: dating.intentions || "",
      preferredMinAge: dating.preferredMinAge || 18,
      preferredMaxAge: dating.preferredMaxAge || 60,
      preferredCity: dating.preferredCity || "",
      preferredIntentions: dating.preferredIntentions || "",
      bio: dating.bio || "",
      interestsText: Array.isArray(dating.interests)
        ? dating.interests.join(", ")
        : "",
    });
    setDatingPhotos(
      Array.isArray(dating.photos)
        ? dating.photos.filter(Boolean).map(makePhotoItem)
        : []
    );
  }, [authUser]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      localPhotoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAgeRangeChange = (field, value) => {
    const nextValue = Number(value);
    setFormData((prev) => {
      const next = { ...prev, [field]: nextValue };
      if (field === "preferredMinAge" && nextValue > Number(prev.preferredMaxAge)) {
        next.preferredMaxAge = nextValue;
      }
      if (field === "preferredMaxAge" && nextValue < Number(prev.preferredMinAge)) {
        next.preferredMinAge = nextValue;
      }
      return next;
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleGalleryChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = MAX_DATING_PHOTOS - datingPhotos.length;
    if (remainingSlots <= 0) {
      toast.error(`You can upload up to ${MAX_DATING_PHOTOS} dating photos`);
      e.target.value = "";
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length !== files.length) {
      toast.error("Only image files are allowed");
    }

    const selectedPhotos = imageFiles.slice(0, remainingSlots).map((file) => {
      const url = URL.createObjectURL(file);
      localPhotoUrlsRef.current.push(url);
      return {
        id: `${file.name}-${file.lastModified}-${url}`,
        url,
        file,
        isNew: true,
      };
    });

    if (imageFiles.length > remainingSlots) {
      toast.error(`Only ${remainingSlots} more photo(s) can be added`);
    }

    setDatingPhotos((prev) => [...prev, ...selectedPhotos]);
    e.target.value = "";
  };

  const removeDatingPhoto = (photoId) => {
    setDatingPhotos((prev) => {
      const photo = prev.find((item) => item.id === photoId);
      if (photo?.isNew) URL.revokeObjectURL(photo.url);
      return prev.filter((item) => item.id !== photoId);
    });
  };

  const setMainDatingPhoto = (photoId) => {
    setDatingPhotos((prev) => {
      const photo = prev.find((item) => item.id === photoId);
      if (!photo) return prev;
      return [photo, ...prev.filter((item) => item.id !== photoId)];
    });
  };

  const handleRequestVerification = async () => {
    await requestProfileVerification();
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    const profileUpdate = { fullName: formData.fullName.trim(), phone: formData.phone.trim() };
    if (selectedFile) {
      profileUpdate.profilePic = await compressImageFile(selectedFile, AVATAR_IMAGE_SIZE);
    }

    await updateProfile(profileUpdate);

    const photos = await Promise.all(
      datingPhotos.map((photo) =>
        photo.file ? compressImageFile(photo.file, DATING_IMAGE_SIZE) : photo.url
      )
    );

    const updatedUser = await updateDatingProfile({
      age: formData.age,
      gender: formData.gender,
      interestedIn: formData.interestedIn,
      city: formData.city,
      intentions: formData.intentions,
      preferredMinAge: formData.preferredMinAge,
      preferredMaxAge: formData.preferredMaxAge,
      preferredCity: formData.preferredCity,
      preferredIntentions: formData.preferredIntentions,
      bio: formData.bio,
      photos,
      interests: formData.interestsText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });

    if (updatedUser) setAuthUser(updatedUser);
    if (updatedUser?.datingProfile?.photos) {
      localPhotoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      localPhotoUrlsRef.current = [];
      setDatingPhotos(updatedUser.datingProfile.photos.map(makePhotoItem));
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
  };

  if (!authUser) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  const isSaving = isUpdatingProfile || isDatingActionLoading;
  const profileCompletion = getProfileCompletion({
    authUser,
    formData,
    datingPhotos,
    previewUrl,
  });

  return (
    <div className="flex h-full flex-col bg-white md:bg-transparent">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-4 sm:px-8 sm:py-6">
        <h3 className="text-lg font-bold text-gray-900 sm:text-xl">Profile</h3>
        <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
          Account and dating profile
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
          <section className="rounded-lg border border-pink-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900">Profile strength</h4>
                <p className="mt-1 text-sm text-gray-500">
                  Complete your dating profile to appear more reliable in Discover.
                </p>
              </div>
              <span className="rounded-lg bg-pink-50 px-3 py-1 text-sm font-bold text-pink-600">
                {profileCompletion.percent}%
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-pink-500 transition-all"
                style={{ width: `${profileCompletion.percent}%` }}
              />
            </div>
            {profileCompletion.missing.length > 0 && (
              <p className="mt-3 text-xs text-gray-500">
                Missing: {profileCompletion.missing.slice(0, 4).join(", ")}
                {profileCompletion.missing.length > 4 ? "..." : ""}
              </p>
            )}
          </section>
          <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${authUser.profileVerification?.status === "verified" ? "bg-emerald-50 text-emerald-600" : "bg-pink-50 text-pink-500"}`}>
                  {authUser.profileVerification?.status === "verified" ? <ShieldCheck className="h-5 w-5" /> : <ShieldQuestion className="h-5 w-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Profile verification</h4>
                  <p className="mt-1 text-sm text-gray-500">
                    {authUser.profileVerification?.status === "verified"
                      ? "Your dating profile has been verified by an admin."
                      : authUser.profileVerification?.status === "pending"
                        ? "Your verification request is waiting for admin review."
                        : authUser.profileVerification?.status === "rejected"
                          ? authUser.profileVerification?.note || "Your previous request was rejected. Please update your profile and request again."
                          : "Request admin verification after completing your dating profile."}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <span className={`rounded-lg px-3 py-1 text-xs font-bold uppercase ${
                  authUser.profileVerification?.status === "verified"
                    ? "bg-emerald-50 text-emerald-600"
                    : authUser.profileVerification?.status === "pending"
                      ? "bg-amber-50 text-amber-600"
                      : authUser.profileVerification?.status === "rejected"
                        ? "bg-red-50 text-red-600"
                        : "bg-gray-100 text-gray-500"
                }`}>
                  {authUser.profileVerification?.status || "none"}
                </span>
                <button
                  type="button"
                  onClick={handleRequestVerification}
                  disabled={isSaving || authUser.profileVerification?.status === "pending" || authUser.profileVerification?.status === "verified"}
                  className="rounded-lg bg-pink-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Request verification
                </button>
              </div>
            </div>
          </section>

          <div className="space-y-6 border-b border-gray-100 pb-6">

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              <button
                type="button"
                className="group relative"
                onClick={() => fileInputRef.current.click()}
              >
                <img
                  src={
                    previewUrl ||
                    authUser.profilePic ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.fullName || "User")}&background=random`
                  }
                  alt="Avatar"
                  className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md transition group-hover:opacity-90"
                />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-7 w-7 text-white" />
                </span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />

              <div className="text-center sm:text-left">
                <h4 className="font-medium text-gray-900">Avatar</h4>
                <p className="mb-2 mt-1 text-sm text-gray-500">
                  Used in chat, calls, and account views
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="text-sm font-semibold text-pink-600 hover:text-pink-700"
                >
                  Upload New
                </button>
              </div>
            </div>

            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Dating photos</h4>
                  <p className="mt-1 text-sm text-gray-500">
                    First photo appears first on your dating profile. {datingPhotos.length}/{MAX_DATING_PHOTOS}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current.click()}
                  disabled={datingPhotos.length >= MAX_DATING_PHOTOS || isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-pink-200 px-4 py-2 text-sm font-semibold text-pink-600 transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ImagePlus className="h-4 w-4" />
                  <span>Add photos</span>
                </button>
              </div>
              <input
                type="file"
                ref={galleryInputRef}
                onChange={handleGalleryChange}
                className="hidden"
                accept="image/*"
                multiple
              />

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                {datingPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <img
                      src={photo.url}
                      alt={`Dating photo ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    {index === 0 && (
                      <span className="absolute left-2 top-2 rounded-md bg-pink-500 px-2 py-1 text-[10px] font-bold uppercase text-white">
                        Main
                      </span>
                    )}
                    <div className="absolute inset-x-2 bottom-2 flex justify-between gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => setMainDatingPhoto(photo.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-gray-700 shadow-sm hover:text-pink-600"
                        title="Set as main"
                      >
                        <Star className="h-4 w-4" fill={index === 0 ? "currentColor" : "none"} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDatingPhoto(photo.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-gray-700 shadow-sm hover:text-red-600"
                        title="Remove photo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {datingPhotos.length < MAX_DATING_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current.click()}
                    disabled={isSaving}
                    className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400 transition hover:border-pink-300 hover:bg-pink-50 hover:text-pink-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-xs font-semibold">Add</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <section className="space-y-5">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-400" />
              <h4 className="text-sm font-bold text-gray-900">Account</h4>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Full Name
                </span>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  placeholder="Enter your full name"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email
                </span>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={authUser.email}
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-400"
                  />
                </div>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Phone Number
                </span>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                    placeholder="Enter your phone number"
                    maxLength={30}
                  />
                </div>
              </label>
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              <h4 className="text-sm font-bold text-gray-900">Dating</h4>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Age
                </span>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={formData.age}
                  onChange={(e) => handleChange("age", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  City
                </span>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                    placeholder="Hanoi"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Gender
                </span>
                <select
                  value={formData.gender}
                  onChange={(e) => handleChange("gender", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="">Select</option>
                  <option value="woman">Woman</option>
                  <option value="man">Man</option>
                  <option value="nonbinary">Nonbinary</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Interested In
                </span>
                <select
                  value={formData.interestedIn}
                  onChange={(e) => handleChange("interestedIn", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="everyone">Everyone</option>
                  <option value="women">Women</option>
                  <option value="men">Men</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Intentions
                </span>
                <select
                  value={formData.intentions}
                  onChange={(e) => handleChange("intentions", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="">Select</option>
                  <option value="relationship">Relationship</option>
                  <option value="casual">Casual</option>
                  <option value="friends">Friends</option>
                  <option value="not-sure">Not sure</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Bio
                </span>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  placeholder="A short intro"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Tags className="h-4 w-4 text-gray-400" />
                  Interests
                </span>
                <input
                  type="text"
                  value={formData.interestsText}
                  onChange={(e) => handleChange("interestsText", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  placeholder="music, coffee, travel"
                />
              </label>
            </div>
          </section>


          <section className="space-y-5 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-pink-500" />
              <h4 className="text-sm font-bold text-gray-900">Discovery Preferences</h4>
            </div>

            <div className="rounded-xl bg-pink-50/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Age range</p>
                  <p className="mt-1 text-xs text-gray-500">Profiles outside this range will be hidden from Discover.</p>
                </div>
                <span className="rounded-lg bg-white px-3 py-1 text-sm font-bold text-pink-600 shadow-sm">
                  {formData.preferredMinAge} - {formData.preferredMaxAge}
                </span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-gray-500">Minimum age</span>
                  <input
                    type="range"
                    min="18"
                    max="100"
                    value={formData.preferredMinAge}
                    onChange={(e) => handleAgeRangeChange("preferredMinAge", e.target.value)}
                    className="w-full accent-pink-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-gray-500">Maximum age</span>
                  <input
                    type="range"
                    min="18"
                    max="100"
                    value={formData.preferredMaxAge}
                    onChange={(e) => handleAgeRangeChange("preferredMaxAge", e.target.value)}
                    className="w-full accent-pink-500"
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Preferred City
                </span>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.preferredCity}
                    onChange={(e) => handleChange("preferredCity", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                    placeholder="Any city"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Preferred Intentions
                </span>
                <select
                  value={formData.preferredIntentions}
                  onChange={(e) => handleChange("preferredIntentions", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="">Any intention</option>
                  <option value="relationship">Relationship</option>
                  <option value="casual">Casual</option>
                  <option value="friends">Friends</option>
                  <option value="not-sure">Not sure</option>
                </select>
              </label>
            </div>
          </section>

          <div className="pb-8 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-pink-500 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-70 sm:ml-auto sm:w-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
