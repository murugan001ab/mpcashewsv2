import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { jwtDecode } from "jwt-decode";

export default function AccountTab() {
  const [profile, setProfile] = useState(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [error, setError] = useState("");

  const token = localStorage.getItem("accessToken");

  // Load user info from JWT
  useEffect(() => {
    if (token) {
      const decoded = jwtDecode(token);
      setProfile({
        username: decoded.username,
        email: decoded.email,
        avatar: decoded.avatar,
      });
      setNewUsername(decoded.username);
      setPreviewAvatar(decoded.avatar);
    }
  }, [token]);

  // Avatar change
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    setAvatarFile(file);

    if (file) setPreviewAvatar(URL.createObjectURL(file));
  };

  // Submit update
  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");

    // Validate password (old password removed)
    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        setError("New passwords do not match");
        return;
      }
    }

    try {
      const formData = new FormData();

      if (newUsername !== profile.username) {
        formData.append("username", newUsername);
      }

      if (newPassword) {
        formData.append("password", newPassword);
      }

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const res = await api.post("/auth/update-user/", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",  // IMPORTANT
        },
      });


      alert("Profile updated successfully!");

      // if backend sends new token → update localStorage
      if (res.data.tokens) {
        localStorage.setItem("accessToken", res.data.tokens.access);
        localStorage.setItem("refreshToken", res.data.tokens.refresh);

        const newDecoded = jwtDecode(res.data.tokens.access);

        setProfile({
          username: newDecoded.username,
          email: newDecoded.email,
          avatar: newDecoded.avatar,
        });

        setNewUsername(newDecoded.username);
        setPreviewAvatar(newDecoded.avatar);  // <-- NOW WORKS


      }
      console.log(profile)


    } catch (err) {
      console.log(err);
      setError("Something went wrong");
    }
  };
  // console.log(photo)

  if (!profile) return <p>Loading...</p>;

  return (
    <div className="account-tab">
      <h3>Account Details</h3>

      {error && <p className="error-msg">{error}</p>}

      {/* Avatar */}
      <div className="avatar-section">
        {previewAvatar ? (
          <img src={previewAvatar} referrerPolicy="no-referrer" className="avatar-preview" alt="avatar" />
        ) : (
          <div className="avatar-placeholder">
            {profile.username[0].toUpperCase()}
          </div>
        )}

        <label className="avatar-upload-btn">
          Change Avatar
          <input type="file" accept="image/*" onChange={handleAvatarChange} />
        </label>
      </div>

      <form onSubmit={handleUpdate} className="account-form">

        <label>Username</label>
        <input
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
        />

        <label>Email</label>
        <input value={profile.email} disabled />

        <label>New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <label>Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button type="submit" className="save-btn">Save Changes</button>
      </form>
    </div>
  );
}
