import {
  Baby,
  Briefcase,
  Cigarette,
  GraduationCap,
  MapPin,
  Ruler,
  ShieldCheck,
  Wine,
  X,
} from "lucide-react";

const intentionLabels = {
  relationship: "Relationship",
  casual: "Casual",
  friends: "Friends",
  "not-sure": "Not sure",
};

const educationLabels = {
  "high-school": "High school",
  college: "College",
  bachelor: "Bachelor's degree",
  master: "Master's degree",
  phd: "PhD",
  other: "Other",
};

const childrenLabels = {
  "have-children": "Have children",
  "dont-have-children": "Do not have children",
  "want-children": "Want children",
  "dont-want-children": "Do not want children",
  "open-to-children": "Open to children",
  "prefer-not-say": "Prefer not to say",
};

const habitLabels = {
  never: "Never",
  socially: "Socially",
  occasionally: "Occasionally",
  regularly: "Regularly",
  "prefer-not-say": "Prefer not to say",
};

function fallbackAvatarFor(user) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || "User")}&background=random`;
}

function profilePhotos(user) {
  const photos = Array.isArray(user?.datingProfile?.photos)
    ? user.datingProfile.photos.filter(Boolean)
    : [];

  if (photos.length > 0) return photos;
  if (user?.profilePic) return [user.profilePic];
  if (user?.avatar) return [user.avatar];
  return [fallbackAvatarFor(user)];
}

function profileMeta(user) {
  const profile = user?.datingProfile || {};
  return [profile.age, profile.city].filter(Boolean).join(" / ");
}

function sharedInterestsFor(currentUser, profile) {
  const currentInterests = Array.isArray(currentUser?.datingProfile?.interests)
    ? currentUser.datingProfile.interests.map((item) => String(item).toLowerCase())
    : [];
  const profileInterests = Array.isArray(profile?.datingProfile?.interests)
    ? profile.datingProfile.interests
    : [];

  return profileInterests.filter((interest) =>
    currentInterests.includes(String(interest).toLowerCase())
  );
}

function DetailRow({ label, value, icon: Icon }) {
  if (!value) return null;

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
        {Icon && <Icon size={13} />}
        {label}
      </div>
      <p className="mt-1 text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}

export default function ProfileDetailModal({ profile, currentUser, onClose }) {
  if (!profile) return null;

  const dating = profile.datingProfile || {};
  const photos = profilePhotos(profile);
  const interests = Array.isArray(dating.interests) ? dating.interests : [];
  const sharedInterests = sharedInterestsFor(currentUser, profile);
  const isProfileVerified = profile?.profileVerification?.status === "verified";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative min-h-[320px] bg-gray-100 md:min-h-0">
          <img
            src={photos[0]}
            alt={profile.fullName || profile.name || "Profile"}
            className="h-full max-h-[42vh] w-full object-cover md:max-h-none"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-5 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-3xl font-bold">{profile.fullName || profile.name}</h2>
              {isProfileVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold">
                  <ShieldCheck size={14} />
                  Verified
                </span>
              )}
            </div>
            {profileMeta(profile) && (
              <div className="mt-2 flex items-center gap-2 text-sm text-white/90">
                <MapPin size={16} />
                <span>{profileMeta(profile)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-gray-900">Profile details</h3>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-800"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-5">
            <section>
              <h4 className="text-sm font-bold text-gray-900">Basic Information</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <DetailRow label="Age" value={dating.age} />
                <DetailRow label="City" value={dating.city} icon={MapPin} />
                <DetailRow label="Height" value={dating.height ? `${dating.height} cm` : ""} icon={Ruler} />
                <DetailRow label="Gender" value={dating.gender} />
                <DetailRow label="Intentions" value={intentionLabels[dating.intentions] || dating.intentions} />
              </div>
            </section>

            <section>
              <h4 className="text-sm font-bold text-gray-900">Bio</h4>
              <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-600">
                {dating.bio || "No bio yet."}
              </p>
            </section>

            <section>
              <h4 className="text-sm font-bold text-gray-900">Work and Education</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <DetailRow label="Job Title" value={dating.jobTitle} icon={Briefcase} />
                <DetailRow label="Company" value={dating.company} icon={Briefcase} />
                <DetailRow label="High School" value={dating.highSchool} icon={GraduationCap} />
                <DetailRow label="University" value={dating.university} icon={GraduationCap} />
                <DetailRow label="Graduate School" value={dating.graduateSchool} icon={GraduationCap} />
                <DetailRow label="Education Level" value={educationLabels[dating.educationLevel] || dating.educationLevel} icon={GraduationCap} />
              </div>
            </section>

            <section>
              <h4 className="text-sm font-bold text-gray-900">Lifestyle</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <DetailRow label="Children" value={childrenLabels[dating.childrenStatus] || dating.childrenStatus} icon={Baby} />
                <DetailRow label="Smoking" value={habitLabels[dating.smoking] || dating.smoking} icon={Cigarette} />
                <DetailRow label="Drinking" value={habitLabels[dating.drinking] || dating.drinking} icon={Wine} />
              </div>
            </section>

            {interests.length > 0 && (
              <section>
                <h4 className="text-sm font-bold text-gray-900">Interests</h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <span
                      key={interest}
                      className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                        sharedInterests.includes(interest)
                          ? "border-pink-200 bg-pink-50 text-pink-600"
                          : "border-gray-200 text-gray-600"
                      }`}
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {photos.length > 1 && (
              <section>
                <h4 className="text-sm font-bold text-gray-900">Photos</h4>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {photos.slice(1).map((photo, index) => (
                    <img
                      key={`${photo}-${index}`}
                      src={photo}
                      alt={`${profile.fullName || profile.name || "Profile"} ${index + 2}`}
                      className="aspect-[3/4] rounded-lg object-cover"
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
