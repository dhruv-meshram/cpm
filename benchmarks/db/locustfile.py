import uuid
from locust import HttpUser, task, between

class CPMDatabaseUser(HttpUser):
    # Simulated think time between user actions (seconds)
    wait_time = between(0.5, 2.0)

    def on_start(self):
        """ Runs when a simulated concurrent user starts up.
            Automatically registers/logs in the user to obtain an active session cookie.
        """
        self.email = "test123@gmail.com"
        self.password = "Password123!"
        self.bypass_headers = {"x-bypass-rate-limit": "true"}

        # Attempt to login. If credentials don't exist, sign up first.
        login_res = self.client.post(
            "/api/v1/auth/login",
            json={"email": self.email, "password": self.password},
            headers=self.bypass_headers
        )

        if login_res.status_code != 200:
            # Attempt Signup
            self.client.post(
                "/api/v1/auth/signup",
                json={"name": "LocustUser", "email": self.email, "password": self.password},
                headers=self.bypass_headers
            )
            # Re-login
            self.client.post(
                "/api/v1/auth/login",
                json={"email": self.email, "password": self.password},
                headers=self.bypass_headers
            )

    @task(3)
    def view_dashboard_stats(self):
        """ Read task: retrieves dashboard statistics. """
        self.client.get("/api/v1/dashboard/stats", headers=self.bypass_headers)

    @task(3)
    def list_projects(self):
        """ Read task: lists the workspace projects. """
        self.client.get("/api/v1/projects", headers=self.bypass_headers)

    @task(1)
    def create_project_scenario(self):
        """ Write task: creates a project, fetches its details, then deletes it. """
        # 1. Create a project
        proj_name = f"Locust Project {uuid.uuid4().hex[:6]}"
        create_res = self.client.post(
            "/api/v1/projects",
            json={"name": proj_name, "description": "Locust write test project"},
            headers=self.bypass_headers
        )
        
        if create_res.status_code == 201:
            project_id = create_res.json().get("id")
            if project_id:
                # 2. Read project detail
                self.client.get(f"/api/v1/projects/{project_id}", headers=self.bypass_headers)
                # 3. Read project overview metrics
                self.client.get(f"/api/v1/projects/{project_id}/overview", headers=self.bypass_headers)
                # 4. Clean up the project
                self.client.delete(f"/api/v1/projects/{project_id}", headers=self.bypass_headers)

    @task(2)
    def check_notifications(self):
        """ Read task: check count and summary of notifications. """
        self.client.get("/api/v1/notifications/count", headers=self.bypass_headers)
        self.client.get("/api/v1/notifications/summary", headers=self.bypass_headers)
