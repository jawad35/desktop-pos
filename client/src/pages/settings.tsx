"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
    const [tax, setTax] = useState("0");
    const [discount, setDiscount] = useState("0");
    const [loading, setLoading] = useState(false);

    // Fetch current settings
    useEffect(() => {
        const token = localStorage.getItem("token");
        fetch("/api/settings", {
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            }
        })
            .then((res) => res.json())
            .then((data) => {
                setTax(data.tax || "0");
                setDiscount(data.discount || "0");
            });
    }, []);

    const handleSave = async () => {
        setLoading(true);
        const token = localStorage.getItem("token");

        const res = await fetch("/api/settings", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: "include",
            body: JSON.stringify({
                tax: parseFloat(tax),
                discount: parseFloat(discount),
            }),
        });

        if (res.ok) {
            alert("Settings updated!");
        } else {
            alert("Failed to update settings");
        }
        setLoading(false);
    };

    return (
        <div className="max-w-lg mx-auto p-6">
            <Card>
                <CardHeader>
                    <CardTitle>POS Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Tax (%)</label>
                        <Input
                            type="number"
                            step="0.01"
                            value={tax}
                            onChange={(e) => setTax(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Discount (%)</label>
                        <Input
                            type="number"
                            step="0.01"
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save Settings"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
