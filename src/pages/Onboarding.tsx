import { Navigate } from "react-router-dom";
// Onboarding removed — app opens directly to shop.
const Onboarding = () => <Navigate to="/shop" replace />;
export default Onboarding;
