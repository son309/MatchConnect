import { useEffect, useRef, useState } from "react";
import {
  Heart,
  Loader2,
  MapPin,
  RefreshCw,
  UserRound,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useDating } from "../../../context/DatingContext";

const intentionLabels = {
  relationship: "Relationship",
  casual: "Casual",
  friends: "Friends",
  "not-sure": "Not sure",
};

const tabIds = ["discover", "liked-you"];

function normalizeTab(tab) {
  return tabIds.includes(tab) ? tab : "discover";
}

function fallbackAvatarFor(user) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || "User")}&background=random`;
}

function profilePhotos(user) {
  const photos = Array.isArray(user?.datingProfile?.photos)
    ? user.datingProfile.photos.filter(Boolean)
    : [];

  if (photos.length > 0) return photos;
  if (user?.profilePic) return [user.profilePic];
  return [fallbackAvatarFor(user)];
}

function avatarFor(user) {
  return profilePhotos(user)[0];
}

function profileMeta(user) {
  const profile = user?.datingProfile || {};
  return [profile.age, profile.city].filter(Boolean).join(" / ");
}

const SWIPE_THRESHOLD = 130;
const PHOTO_CLICK_THRESHOLD = 8;

function ProfileCard({
  profile,
  onLike,
  onPass,
  disabled,
  likeLabel = "Like",
  passLabel = "Pass",
  likeTitle = "Like",
  passTitle = "Pass",
}) {
  const dating = profile?.datingProfile || {};
  const interests = Array.isArray(dating.interests) ? dating.interests : [];
  const photos = profilePhotos(profile);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [drag, setDrag] = useState({ active: false, startX: 0, startY: 0, x: 0, y: 0 });
  const pointerRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
    startedOnPhoto: false,
  });

  const likeOpacity = Math.min(Math.max(drag.x / SWIPE_THRESHOLD, 0), 1);
  const passOpacity = Math.min(Math.max(-drag.x / SWIPE_THRESHOLD, 0), 1);
  const rotation = drag.x / 18;

  const resetDrag = () => {
    pointerRef.current = {
      active: false,
      startX: 0,
      startY: 0,
      x: 0,
      y: 0,
      startedOnPhoto: false,
    };
    setDrag({ active: false, startX: 0, startY: 0, x: 0, y: 0 });
  };

  const handlePointerDown = (event) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const nextDrag = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      x: 0,
      y: 0,
      startedOnPhoto: Boolean(event.target.closest("[data-photo-area='true']")),
    };

    pointerRef.current = nextDrag;
    setDrag(nextDrag);
  };

  const handlePointerMove = (event) => {
    if (!pointerRef.current.active || disabled) return;

    const nextDrag = {
      ...pointerRef.current,
      x: event.clientX - pointerRef.current.startX,
      y: event.clientY - pointerRef.current.startY,
    };

    pointerRef.current = nextDrag;
    setDrag(nextDrag);
  };

  const handlePointerEnd = async () => {
    if (!pointerRef.current.active || disabled) return;

    const finalX = pointerRef.current.x;
    const finalY = pointerRef.current.y;
    const shouldShowNextPhoto =
      pointerRef.current.startedOnPhoto &&
      photos.length > 1 &&
      Math.abs(finalX) <= PHOTO_CLICK_THRESHOLD &&
      Math.abs(finalY) <= PHOTO_CLICK_THRESHOLD;
    resetDrag();

    if (finalX > SWIPE_THRESHOLD) {
      await onLike();
    } else if (finalX < -SWIPE_THRESHOLD) {
      await onPass();
    } else if (shouldShowNextPhoto) {
      setActivePhotoIndex((prev) => (prev + 1) % photos.length);
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={resetDrag}
      style={{
        transform: `translate3d(${drag.x}px, ${drag.y}px, 0) rotate(${rotation}deg)`,
        transition: drag.active ? "none" : "transform 180ms ease",
        touchAction: "pan-y",
      }}
      className={`relative grid min-h-0 select-none grid-cols-1 overflow-hidden border border-gray-100 bg-white shadow-sm md:h-[calc(100vh-180px)] md:max-h-[760px] md:min-h-[560px] md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] ${
        disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"
      }`}
    >
      <div
        className="pointer-events-none absolute left-6 top-6 z-30 rotate-[-10deg] rounded-lg border-4 border-emerald-500 px-4 py-2 text-2xl font-black uppercase text-emerald-500"
        style={{ opacity: likeOpacity }}
      >
        {likeLabel}
      </div>
      <div
        className="pointer-events-none absolute right-6 top-6 z-30 rotate-[10deg] rounded-lg border-4 border-red-500 px-4 py-2 text-2xl font-black uppercase text-red-500"
        style={{ opacity: passOpacity }}
      >
        {passLabel}
      </div>
      <div
        data-photo-area="true"
        className={`relative h-[520px] overflow-hidden bg-gray-100 sm:h-[620px] md:h-full ${photos.length > 1 ? "cursor-pointer" : ""}`}
        title={photos.length > 1 ? "Next photo" : undefined}
      >
        <img
          src={photos[activePhotoIndex] || avatarFor(profile)}
          alt={profile.fullName}
          className="block h-full w-full object-cover"
        />
        {photos.length > 1 && (
          <div
            className="pointer-events-none absolute left-4 right-4 top-4 z-20 flex gap-1.5"
          >
            {photos.map((photo, index) => (
              <div
                key={`${photo}-${index}`}
                className={`h-1.5 flex-1 rounded-full shadow-sm transition ${
                  activePhotoIndex === index
                    ? "bg-white"
                    : "bg-white/45"
                }`}
              />
            ))}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-5 text-white">
          <h2 className="text-3xl font-bold">{profile.fullName}</h2>
          {profileMeta(profile) && (
            <div className="mt-2 flex items-center gap-2 text-sm text-white/90">
              <MapPin size={16} />
              <span>{profileMeta(profile)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col justify-between overflow-y-auto p-5">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {dating.intentions && (
              <span className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                {intentionLabels[dating.intentions] || dating.intentions}
              </span>
            )}
            {dating.gender && (
              <span className="rounded-lg bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                {dating.gender}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-900">Bio</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {dating.bio || "No bio yet."}
            </p>
          </div>

          {interests.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900">Interests</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <span
                    key={interest}
                    className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          className="mt-6 flex items-center justify-center gap-4"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            onClick={onPass}
            disabled={disabled}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            title={passTitle}
          >
            <X size={26} />
          </button>
          <button
            onClick={onLike}
            disabled={disabled}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600 disabled:opacity-50"
            title={likeTitle}
          >
            <Heart size={30} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DatingDashboard() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => normalizeTab(searchParams.get("tab")));
  const {
    discoverProfiles,
    likedYou,
    isDatingLoading,
    isDatingActionLoading,
    getDiscoverProfiles,
    getLikedYou,
    getMatches,
    likeProfile,
    passProfile,
  } = useDating();
  const currentProfile = discoverProfiles[0];
  const currentLikedProfile = likedYou[0];
  const pageTitle = activeTab === "liked-you" ? "Liked You" : "Discover";

  useEffect(() => {
    getDiscoverProfiles();
    getLikedYou();
    getMatches();
  }, [getDiscoverProfiles, getLikedYou, getMatches]);

  useEffect(() => {
    setActiveTab(normalizeTab(searchParams.get("tab")));
  }, [searchParams]);

  const acceptLike = async (user) => {
    await likeProfile(user._id);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#FAFAFA]">
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
        <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
        <button
          onClick={activeTab === "liked-you" ? getLikedYou : getDiscoverProfiles}
          className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
          title="Refresh"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        {activeTab === "discover" ? (
          <div className="mx-auto max-w-4xl">
            {isDatingLoading ? (
              <div className="flex h-[480px] items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
              </div>
            ) : currentProfile ? (
              <ProfileCard
                key={currentProfile._id}
                profile={currentProfile}
                disabled={isDatingActionLoading}
                onLike={() => likeProfile(currentProfile._id)}
                onPass={() => passProfile(currentProfile._id)}
              />
            ) : (
              <div className="flex h-[480px] flex-col items-center justify-center border border-dashed border-gray-200 bg-white text-center">
                <UserRound className="mb-3 h-12 w-12 text-gray-300" />
                <h2 className="text-lg font-bold text-gray-800">No profiles</h2>
                <button
                  onClick={getDiscoverProfiles}
                  className="mt-4 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
        ) : activeTab === "liked-you" ? (
          <div className="mx-auto max-w-4xl">
            {currentLikedProfile ? (
              <ProfileCard
                key={currentLikedProfile._id}
                profile={currentLikedProfile}
                disabled={isDatingActionLoading}
                onLike={() => acceptLike(currentLikedProfile)}
                onPass={() => passProfile(currentLikedProfile._id)}
                likeLabel="Match"
                passLabel="Nope"
                likeTitle="Accept match"
                passTitle="Reject"
              />
            ) : (
              <div className="flex h-[480px] flex-col items-center justify-center border border-dashed border-gray-200 bg-white text-gray-400">
                <Heart className="mb-3 h-12 w-12" />
                <p className="text-sm font-medium">No likes yet</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
