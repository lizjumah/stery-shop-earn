import { Navigate } from "react-router-dom";
// Onboarding removed — app opens directly to shop.
const Welcome = () => <Navigate to="/shop" replace />;
export default Welcome;
