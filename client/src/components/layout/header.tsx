import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, Menu, User, LogOut, AlertTriangle, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { User as UserType } from "@/types/api";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const { user, shop } = useAuth();
  const [licenseStatus, setLicenseStatus] = useState<{
    isExpired: boolean;
    isGracePeriod: boolean;
    timeLeft: number;
    timeLeftText: string;
    expiryDate: string;
  } | null>(null);

  useEffect(() => {
    checkLicenseStatus();
    // Check every second for testing (change to 60000 for production)
    const interval = setInterval(checkLicenseStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  // AUTO REDIRECT: If grace period has ended (when secondsExpired >= gracePeriodSeconds)
  const checkLicenseStatus = async () => {
    try {
      if (window.electronAPI && window.electronAPI.checkLicense) {
        const result = await window.electronAPI.checkLicense();

        if (result.success && result.expiry_date) {
          const expiryDate = new Date(result.expiry_date);
          const now = new Date();
          const timeLeftMs = expiryDate.getTime() - now.getTime();
          const timeLeftSeconds = Math.floor(timeLeftMs / 1000);
          const isExpired = timeLeftMs < 0;

          // How many seconds has it been expired?
          const secondsExpired = isExpired ? Math.abs(timeLeftSeconds) : 0;

          // Grace period: 30 seconds
          const gracePeriodSeconds = 30;

          // Grace period remaining (starts at 30 and counts down to 0)
          const graceRemaining = Math.max(0, gracePeriodSeconds - secondsExpired);
          const isGracePeriod = isExpired && graceRemaining > 0;

          // console.log('Debug values:', {
          //   isExpired,
          //   secondsExpired,
          //   graceRemaining,
          //   isGracePeriod
          // });

          // If graceRemaining becomes 0, redirect
          if (isExpired && graceRemaining === 0 && !hasRedirected.current) {
            console.log('License expired - redirecting to activation');
            hasRedirected.current = true;
            await window.electronAPI.clearLicense();
            setLocation('/activation');
            return;
          }

          // Format time left text for UI
          let timeLeftText = '';
          if (!isExpired) {
            if (timeLeftSeconds < 60) {
              timeLeftText = `${timeLeftSeconds} seconds`;
            } else {
              timeLeftText = `${Math.floor(timeLeftSeconds / 60)} minutes`;
            }
          } else if (isGracePeriod) {
            timeLeftText = `${graceRemaining} seconds of grace period remaining`;
          }

          setLicenseStatus({
            isExpired,
            isGracePeriod,
            timeLeft: isExpired ? -secondsExpired : timeLeftSeconds,
            timeLeftText,
            expiryDate: result.expiry_date
          });
        }
      }
    } catch (error) {
      console.error('Failed to check license:', error);
    }
  };

  const handleLogout = async () => {
    if (window.electronAPI && window.electronAPI.clearLicense) {
      await window.electronAPI.clearLicense();
    }
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const [, setLocation] = useLocation();
  const hasRedirected = useRef(false);

  // Show warning banner if license is expired or in grace period
  const showWarning = licenseStatus?.isExpired;

  return (
    <>
      {/* License Warning Banner */}
      {showWarning && (
        <div className={`w-full py-2 px-4 text-center text-sm font-medium ${licenseStatus?.isGracePeriod
          ? 'bg-yellow-500 text-yellow-950 animate-pulse'
          : 'bg-destructive text-destructive-foreground'
          }`}>
          <div className="flex items-center justify-center gap-2">
            {licenseStatus?.isGracePeriod ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                <span>
                  ⚠️ GRACE PERIOD: License expired! {licenseStatus.timeLeftText}. Please renew immediately to avoid interruption.
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                <span>
                  ⚠️ LICENSE EXPIRED! Redirecting to activation page...
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Low License Warning (within 30 seconds of expiry) */}
      {licenseStatus && !licenseStatus.isExpired && licenseStatus.timeLeft <= 30 && (
        <div className="w-full py-2 px-4 text-center text-sm font-medium bg-orange-500 text-white animate-pulse">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>
              ⚠️ License expires in {licenseStatus.timeLeftText}! Please renew soon.
            </span>
          </div>
        </div>
      )}

      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              data-testid="button-menu"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div>
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* License Status Badge */}
            {licenseStatus && !licenseStatus.isExpired && (
              <Badge variant={licenseStatus.timeLeft <= 60 ? "destructive" : "secondary"} className="hidden sm:flex">
                <Clock className="h-3 w-3 mr-1" />
                {licenseStatus.timeLeftText} left
              </Badge>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center space-x-3 cursor-pointer">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {shop
                        ? `${shop.owner || ""} ${shop.lastName || ""}`.trim() ||
                        "Admin User"
                        : "Loading..."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email || "admin@shopsmart.pk"}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => (window.location.href = "/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  );
}