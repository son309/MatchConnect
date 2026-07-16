import { useEffect, useRef, useState } from "react";
import {
  Baby,
  Briefcase,
  Camera,
  Cigarette,
  GraduationCap,
  Heart,
  ImagePlus,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Ruler,
  Save,
  Star,
  ShieldCheck,
  ShieldQuestion,
  SlidersHorizontal,
  Tags,
  Trash2,
  User,
  Wine,
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
const AGE_MIN = 18;
const AGE_MAX = 100;
const MAX_INTERESTS = 5;
const SUGGESTED_INTERESTS = [
  "🎸 Playing guitar",
  "🎧 Music",
  "🎬 Movies",
  "☕ Coffee",
  "🍜 Food",
  "✈️ Travel",
  "📚 Reading",
  "🏃 Running",
  "🏋️ Fitness",
  "🎮 Gaming",
  "📷 Photography",
  "🐶 Pets",
  "🎨 Art",
  "🧘 Meditation",
  "💃 Dancing",
  "🍳 Cooking",
  "🏕️ Camping",
  "⚽ Football",
  "🏀 Basketball",
  "🌱 Gardening",
  "🎤 Karaoke",
  "🧩 Board games",
  "🏖️ Beach",
  "🌃 Night walks",
];

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
    { label: "Interests", done: formData.interests.length > 0 },
    { label: "Interested In", done: Boolean(formData.interestedIn) },
  ];
  const completed = checks.filter((item) => item.done).length;

  return {
    checks,
    completed,
    percent: Math.round((completed / checks.length) * 100),
    missing: checks.filter((item) => !item.done).map((item) => item.label),
  };
}


function getAgeRangePercent(value) {
  return ((Number(value) - AGE_MIN) / (AGE_MAX - AGE_MIN)) * 100;
}

function DualAgeRangeSlider({ minValue, maxValue, onChange }) {
  const minPercent = getAgeRangePercent(minValue);
  const maxPercent = getAgeRangePercent(maxValue);

  const rangeInputClass = "pointer-events-none absolute inset-x-0 top-1/2 h-6 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-20 [&::-webkit-slider-thumb]:mt-[-7px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-pink-500 [&::-webkit-slider-thumb]:bg-white/70 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:backdrop-blur-sm [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-pink-500 [&::-moz-range-thumb]:bg-white/70 [&::-moz-range-thumb]:shadow-sm";

  return (
    <div className="pt-4">
      <div className="relative h-10 px-1">
        <div className="absolute inset-x-1 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gray-200" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-pink-500"
          style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
        />
        <input
          type="range"
          min={AGE_MIN}
          max={AGE_MAX}
          value={minValue}
          onChange={(event) => onChange("preferredMinAge", event.target.value)}
          className={rangeInputClass}
          aria-label="Minimum age"
        />
        <input
          type="range"
          min={AGE_MIN}
          max={AGE_MAX}
          value={maxValue}
          onChange={(event) => onChange("preferredMaxAge", event.target.value)}
          className={rangeInputClass}
          aria-label="Maximum age"
        />
      </div>
      <div className="mt-2 flex justify-between text-xs font-semibold text-gray-400">
        <span>{AGE_MIN}</span>
        <span>{AGE_MAX}</span>
      </div>
    </div>
  );
}

function getMissingRequiredFields({ authUser, formData, datingPhotos, previewUrl, scope = "all" }) {
  const age = Number(formData.age);
  const profileChecks = [
    { label: "Avatar", done: Boolean(previewUrl || authUser?.profilePic) },
    { label: "Dating photos", done: datingPhotos.length > 0 },
    { label: "Full name", done: Boolean(formData.fullName.trim()) },
    { label: "Phone number", done: Boolean(formData.phone.trim()) },
    { label: "Age", done: Number.isFinite(age) && age >= AGE_MIN && age <= AGE_MAX },
    { label: "Gender", done: Boolean(formData.gender) },
    { label: "City", done: Boolean(formData.city.trim()) },
    { label: "Intentions", done: Boolean(formData.intentions) },
    { label: "Bio", done: Boolean(formData.bio.trim()) },
    { label: "Interests", done: formData.interests.length > 0 },
  ];
  const preferenceChecks = [
    { label: "Interested In", done: Boolean(formData.interestedIn) },
  ];
  const checks = [
    ...(scope !== "preferences" ? profileChecks : []),
    ...(scope !== "profile" ? preferenceChecks : []),
  ];

  return checks.filter((item) => !item.done).map((item) => item.label);
}

export default function ProfileSettings({ view = "all" }) {
  const { authUser, isUpdatingProfile, updateProfile, setAuthUser, requestProfileVerification } = useAuth();
  const { isDatingActionLoading, updateDatingProfile } = useDating();

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    age: "",
    height: "",
    gender: "",
    interestedIn: "everyone",
    city: "",
    intentions: "",
    preferredMinAge: 18,
    preferredMaxAge: 60,
    preferredIntentions: "",
    preferredEducationLevel: "any",
    preferredChildrenStatus: "any",
    preferredSmoking: "any",
    preferredDrinking: "any",
    bio: "",
    interests: [],
    interestQuery: "",
    jobTitle: "",
    company: "",
    highSchool: "",
    university: "",
    graduateSchool: "",
    educationLevel: "",
    childrenStatus: "",
    smoking: "",
    drinking: "",
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
    const preferences = authUser.datingPreferences || {};
    setFormData({
      fullName: authUser.fullName || "",
      phone: authUser.phone || "",
      age: dating.age || "",
      height: dating.height || "",
      gender: dating.gender || "",
      interestedIn: preferences.interestedIn || dating.interestedIn || "everyone",
      city: dating.city || "",
      intentions: dating.intentions || "",
      preferredMinAge: preferences.preferredMinAge || dating.preferredMinAge || 18,
      preferredMaxAge: preferences.preferredMaxAge || dating.preferredMaxAge || 60,
      preferredIntentions: preferences.preferredIntentions || dating.preferredIntentions || "",
      preferredEducationLevel: preferences.preferredEducationLevel || "any",
      preferredChildrenStatus: preferences.preferredChildrenStatus || "any",
      preferredSmoking: preferences.preferredSmoking || "any",
      preferredDrinking: preferences.preferredDrinking || "any",
      bio: dating.bio || "",
      interests: Array.isArray(dating.interests) ? dating.interests.slice(0, MAX_INTERESTS) : [],
      interestQuery: "",
      jobTitle: dating.jobTitle || "",
      company: dating.company || "",
      highSchool: dating.highSchool || "",
      university: dating.university || "",
      graduateSchool: dating.graduateSchool || "",
      educationLevel: dating.educationLevel || "",
      childrenStatus: dating.childrenStatus || "",
      smoking: dating.smoking || "",
      drinking: dating.drinking || "",
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

  const addInterest = (interest) => {
    const cleanInterest = String(interest || "").trim();
    if (!cleanInterest) return;

    setFormData((prev) => {
      const exists = prev.interests.some(
        (item) => item.toLowerCase() === cleanInterest.toLowerCase()
      );
      if (exists || prev.interests.length >= MAX_INTERESTS) {
        return { ...prev, interestQuery: "" };
      }

      return {
        ...prev,
        interests: [...prev.interests, cleanInterest],
        interestQuery: "",
      };
    });
  };

  const removeInterest = (interest) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.filter((item) => item !== interest),
    }));
  };

  const handleInterestKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addInterest(formData.interestQuery);
  };

  const handleAgeRangeChange = (field, value) => {
    const nextValue = Math.min(AGE_MAX, Math.max(AGE_MIN, Number(value)));
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

    const missingFields = getMissingRequiredFields({ authUser, formData, datingPhotos, previewUrl, scope: view });
    if (missingFields.length > 0) {
      toast.error(`Please complete your profile before saving: ${missingFields.slice(0, 4).join(", ")}${missingFields.length > 4 ? "..." : ""}`);
      return;
    }

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
      height: formData.height,
      gender: formData.gender,
      interestedIn: formData.interestedIn,
      city: formData.city,
      intentions: formData.intentions,
      preferredMinAge: formData.preferredMinAge,
      preferredMaxAge: formData.preferredMaxAge,
      preferredIntentions: formData.preferredIntentions,
      preferredEducationLevel: formData.preferredEducationLevel,
      preferredChildrenStatus: formData.preferredChildrenStatus,
      preferredSmoking: formData.preferredSmoking,
      preferredDrinking: formData.preferredDrinking,
      bio: formData.bio,
      photos,
      interests: formData.interests,
      jobTitle: formData.jobTitle,
      company: formData.company,
      highSchool: formData.highSchool,
      university: formData.university,
      graduateSchool: formData.graduateSchool,
      educationLevel: formData.educationLevel,
      childrenStatus: formData.childrenStatus,
      smoking: formData.smoking,
      drinking: formData.drinking,
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
  const showDatingProfile = view !== "preferences";
  const showDatingPreferences = view !== "profile";
  const pageTitle = view === "preferences" ? "Dating Preferences" : "Dating Profile";
  const pageDescription = view === "preferences"
    ? "Control who appears in Discover"
    : "Manage how your profile appears to others";
  const profileCompletion = getProfileCompletion({
    authUser,
    formData,
    datingPhotos,
    previewUrl,
  });
  const interestQuery = formData.interestQuery.trim().toLowerCase();
  const selectedInterestNames = formData.interests.map((item) => item.toLowerCase());
  const filteredSuggestedInterests = SUGGESTED_INTERESTS.filter((interest) => {
    const normalizedInterest = interest.toLowerCase();
    return (
      !selectedInterestNames.includes(normalizedInterest) &&
      (!interestQuery || normalizedInterest.includes(interestQuery))
    );
  }).slice(0, 12);
  const canAddTypedInterest =
    formData.interestQuery.trim() &&
    formData.interests.length < MAX_INTERESTS &&
    !selectedInterestNames.includes(formData.interestQuery.trim().toLowerCase());

  return (
    <div className="flex h-full flex-col bg-white md:bg-transparent">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-4 sm:px-8 sm:py-6">
        <h3 className="text-lg font-bold text-gray-900 sm:text-xl">{pageTitle}</h3>
        <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
          {pageDescription}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
          {showDatingProfile && (
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
          )}
          {showDatingProfile && (
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
          )}

          {showDatingProfile && (
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
          )}

          {showDatingProfile && (
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
          )}

          {showDatingProfile && (
          <section className="space-y-5">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              <h4 className="text-sm font-bold text-gray-900">Basic Information</h4>
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
                  Height
                </span>
                <div className="relative">
                  <Ruler className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    min="90"
                    max="250"
                    value={formData.height}
                    onChange={(e) => handleChange("height", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-12 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                    placeholder="170"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">cm</span>
                </div>
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

              <div className="block md:col-span-2">
                <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium text-gray-700">
                  <span className="flex items-center gap-2">
                  <Tags className="h-4 w-4 text-gray-400" />
                  Interests
                  </span>
                  <span className="text-xs font-semibold text-gray-400">
                    {formData.interests.length}/{MAX_INTERESTS}
                  </span>
                </span>

                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  {formData.interests.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {formData.interests.map((interest) => (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => removeInterest(interest)}
                          className="inline-flex items-center gap-2 rounded-full bg-pink-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-pink-600"
                          title="Remove interest"
                        >
                          {interest}
                          <span className="grid h-4 w-4 place-items-center rounded-full bg-white/90 text-xs font-bold text-pink-500">
                            x
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <Tags className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.interestQuery}
                      onChange={(e) => handleChange("interestQuery", e.target.value)}
                      onKeyDown={handleInterestKeyDown}
                      disabled={formData.interests.length >= MAX_INTERESTS}
                      className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 disabled:bg-gray-50 disabled:text-gray-400"
                      placeholder={
                        formData.interests.length >= MAX_INTERESTS
                          ? "You can choose up to 5 interests"
                          : "Search or type an interest"
                      }
                    />
                  </div>

                  {canAddTypedInterest && (
                    <button
                      type="button"
                      onClick={() => addInterest(formData.interestQuery)}
                      className="mt-3 rounded-full border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-semibold text-pink-600 transition hover:bg-pink-100"
                    >
                      Add "{formData.interestQuery.trim()}"
                    </button>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {filteredSuggestedInterests.map((interest) => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => addInterest(interest)}
                        disabled={formData.interests.length >= MAX_INTERESTS}
                        className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
          )}

          {showDatingProfile && (
          <section className="space-y-5">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-pink-500" />
              <h4 className="text-sm font-bold text-gray-900">Work and Education</h4>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Job Title
                </span>
                <input
                  type="text"
                  value={formData.jobTitle}
                  onChange={(e) => handleChange("jobTitle", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  placeholder="Software Engineer"
                  maxLength={80}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Company
                </span>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  placeholder="Company name"
                  maxLength={80}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  High School
                </span>
                <input
                  type="text"
                  value={formData.highSchool}
                  onChange={(e) => handleChange("highSchool", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  placeholder="High school"
                  maxLength={100}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  University
                </span>
                <input
                  type="text"
                  value={formData.university}
                  onChange={(e) => handleChange("university", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  placeholder="University"
                  maxLength={100}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Graduate School
                </span>
                <input
                  type="text"
                  value={formData.graduateSchool}
                  onChange={(e) => handleChange("graduateSchool", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                  placeholder="Graduate school"
                  maxLength={100}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <GraduationCap className="h-4 w-4 text-gray-400" />
                  Education Level
                </span>
                <select
                  value={formData.educationLevel}
                  onChange={(e) => handleChange("educationLevel", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="">Select level</option>
                  <option value="high-school">High school</option>
                  <option value="college">College</option>
                  <option value="bachelor">Bachelor's degree</option>
                  <option value="master">Master's degree</option>
                  <option value="phd">PhD</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
          </section>
          )}

          {showDatingProfile && (
          <section className="space-y-5">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-pink-500" />
              <h4 className="text-sm font-bold text-gray-900">Lifestyle</h4>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Baby className="h-4 w-4 text-gray-400" />
                  Children
                </span>
                <select
                  value={formData.childrenStatus}
                  onChange={(e) => handleChange("childrenStatus", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="">Select</option>
                  <option value="have-children">Have children</option>
                  <option value="dont-have-children">Do not have children</option>
                  <option value="want-children">Want children</option>
                  <option value="dont-want-children">Do not want children</option>
                  <option value="open-to-children">Open to children</option>
                  <option value="prefer-not-say">Prefer not to say</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Cigarette className="h-4 w-4 text-gray-400" />
                  Smoking
                </span>
                <select
                  value={formData.smoking}
                  onChange={(e) => handleChange("smoking", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="">Select</option>
                  <option value="never">Never</option>
                  <option value="socially">Socially</option>
                  <option value="occasionally">Occasionally</option>
                  <option value="regularly">Regularly</option>
                  <option value="prefer-not-say">Prefer not to say</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Wine className="h-4 w-4 text-gray-400" />
                  Drinking
                </span>
                <select
                  value={formData.drinking}
                  onChange={(e) => handleChange("drinking", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="">Select</option>
                  <option value="never">Never</option>
                  <option value="socially">Socially</option>
                  <option value="occasionally">Occasionally</option>
                  <option value="regularly">Regularly</option>
                  <option value="prefer-not-say">Prefer not to say</option>
                </select>
              </label>
            </div>
          </section>
          )}


          {showDatingPreferences && (
          <section className="space-y-5 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-pink-500" />
              <h4 className="text-sm font-bold text-gray-900">Dating Preferences</h4>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Preferred Intentions
                </span>
                <select
                  value={formData.preferredIntentions}
                  onChange={(e) => handleChange("preferredIntentions", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="">Any</option>
                  <option value="relationship">Relationship</option>
                  <option value="casual">Casual</option>
                  <option value="friends">Friends</option>
                  <option value="not-sure">Not sure</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <GraduationCap className="h-4 w-4 text-gray-400" />
                  Education Level
                </span>
                <select
                  value={formData.preferredEducationLevel}
                  onChange={(e) => handleChange("preferredEducationLevel", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="any">Any</option>
                  <option value="high-school">High school</option>
                  <option value="college">College</option>
                  <option value="bachelor">Bachelor's degree</option>
                  <option value="master">Master's degree</option>
                  <option value="phd">PhD</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Baby className="h-4 w-4 text-gray-400" />
                  Children
                </span>
                <select
                  value={formData.preferredChildrenStatus}
                  onChange={(e) => handleChange("preferredChildrenStatus", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="any">Any</option>
                  <option value="have-children">Have children</option>
                  <option value="dont-have-children">Do not have children</option>
                  <option value="want-children">Want children</option>
                  <option value="dont-want-children">Do not want children</option>
                  <option value="open-to-children">Open to children</option>
                  <option value="prefer-not-say">Prefer not to say</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Cigarette className="h-4 w-4 text-gray-400" />
                  Smoking
                </span>
                <select
                  value={formData.preferredSmoking}
                  onChange={(e) => handleChange("preferredSmoking", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="any">Any</option>
                  <option value="never">Never</option>
                  <option value="socially">Socially</option>
                  <option value="occasionally">Occasionally</option>
                  <option value="regularly">Regularly</option>
                  <option value="prefer-not-say">Prefer not to say</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Wine className="h-4 w-4 text-gray-400" />
                  Drinking
                </span>
                <select
                  value={formData.preferredDrinking}
                  onChange={(e) => handleChange("preferredDrinking", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="any">Any</option>
                  <option value="never">Never</option>
                  <option value="socially">Socially</option>
                  <option value="occasionally">Occasionally</option>
                  <option value="regularly">Regularly</option>
                  <option value="prefer-not-say">Prefer not to say</option>
                </select>
              </label>
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
              <DualAgeRangeSlider
                minValue={formData.preferredMinAge}
                maxValue={formData.preferredMaxAge}
                onChange={handleAgeRangeChange}
              />
            </div>

          </section>
          )}

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
