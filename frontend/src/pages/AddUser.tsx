import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import { userService, CreateUser, UserRole } from "../services/userService";
import loadingService from "../services/loadingService";
import { Permissions } from "../utils/permissions";

interface UserFormData {
  firstName: string;
  middleInitial: string;
  lastName: string;
  username: string;
  password: string;
  email: string;
  contactNumber: string;
  address: string;
  role: string;
}

const AddUser = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UserFormData>({
    firstName: "",
    middleInitial: "",
    lastName: "",
    username: "",
    password: "",
    email: "",
    contactNumber: "",
    address: "",
    role: "",
  });

  // Check permissions on mount
  useEffect(() => {
    if (!Permissions.canCreateUser()) {
      toast.error("You do not have permission to create users");
      navigate("/role-management");
    }
  }, [navigate]);

  // Helper function to convert old role format to new Roles format
  const mapStringToRole = (roleString: string): UserRole => {
    switch (roleString?.toUpperCase()) {
      case "PHARMACIST":
        return "Pharmacist";
      case "CLERK":
        return "Clerk";
      case "STAFF":
        return "Clerk"; // Map STAFF to Clerk for backwards compatibility
      default:
        return "Pharmacist"; // Default to Pharmacist
    }
  };

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    // If the field is contactNumber, only allow numeric values
    if (field === 'contactNumber') {
      value = value.replace(/[^0-9]/g, '');
    }
    
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.firstName.trim()) {
      toast.error('First name is required');
      return;
    }

    if (!formData.lastName.trim()) {
      toast.error('Last name is required');
      return;
    }

    if (!formData.username.trim()) {
      toast.error('Username is required');
      return;
    }

    if (!formData.password.trim()) {
      toast.error('Password is required');
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!formData.contactNumber.trim()) {
      toast.error('Contact number is required');
      return;
    }

    // Validate contact number - must be numeric
    if (formData.contactNumber && !/^\d+$/.test(formData.contactNumber)) {
      toast.error('Contact number must contain only numbers');
      return;
    }

    // Validate minimum length
    if (formData.contactNumber && formData.contactNumber.length < 10) {
      toast.error('Contact number must be at least 10 digits');
      return;
    }

    if (!formData.address.trim()) {
      toast.error('Address is required');
      return;
    }

    if (!formData.role || formData.role === '') {
      toast.error('Please select a role');
      return;
    }

    loadingService.start("add-user", "Creating user...");

    try {
      const mappedRole = mapStringToRole(formData.role);

      const createUserData: CreateUser = {
        FirstName: formData.firstName,
        MiddleInitial: formData.middleInitial,
        LastName: formData.lastName,
        Username: formData.username,
        Email: formData.email,
        Password: formData.password,
        Address: formData.address,
        ContactNumber: formData.contactNumber,
        Roles: mappedRole,
      };

      const response = await userService.createUser(createUserData);

      if (response.success) {
        loadingService.success(
          "add-user",
          `User ${formData.firstName} ${formData.lastName} added successfully!`
        );
        navigate("/role-management");
      } else {
        loadingService.error(
          "add-user",
          "Failed to create user: " + response.message
        );
      }
    } catch (error) {
      loadingService.error(
        "add-user",
        "Error creating user: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  const handleCancel = () => {
    navigate("/role-management");
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="mb-6">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Role Management</span>
        </button>
        <h1 className="text-3xl font-bold text-blue-900">ADD USER</h1>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg shadow-sm border border-blue-700 p-8">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Name Fields */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                NAME <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder=""
                    required
                  />
                  <label className="block text-xs text-gray-500 mt-1">
                    FIRST <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="w-24">
                  <input
                    type="text"
                    value={formData.middleInitial}
                    onChange={(e) =>
                      handleInputChange("middleInitial", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder=""
                    maxLength={1}
                  />
                  <label className="block text-xs text-gray-500 mt-1 text-center">
                    M.I.
                  </label>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder=""
                    required
                  />
                  <label className="block text-xs text-gray-500 mt-1">
                    LAST <span className="text-red-500">*</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Username and Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  USERNAME <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    handleInputChange("username", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  PASSWORD <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Email and Contact Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  EMAIL <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  CONTACT NUMBER <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) =>
                    handleInputChange("contactNumber", e.target.value)
                  }
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="Enter numbers only"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                ADDRESS <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                ROLE <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleInputChange("role", e.target.value)}
                className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">--SELECT--</option>
                <option value="PHARMACIST">PHARMACIST</option>
                <option value="CLERK">CLERK</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              type="submit"
              className="px-8 py-3 bg-blue-900 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              CONFIRM
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-8 py-3 border border-blue-900 text-blue-900 rounded-md hover:bg-blue-50 transition-colors font-medium"
            >
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUser;
