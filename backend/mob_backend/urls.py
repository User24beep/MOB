from django.contrib import admin
from django.urls import path, include
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# Define the Swagger schema view with proper API metadata
schema_view = get_schema_view(
   openapi.Info(
      title="Room Manager API",
      default_version='v1',
      description="API for managing rooms in the system",
   ),
   public=True,
)

urlpatterns = [
    # Swagger UI
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0),
         name='schema-swagger-ui'),
   # Admin and RoomManager API
    path('admin/', admin.site.urls),
    path('accounts/', include('accounts.urls')), 
    path('api/', include('rooms.urls')),
   ]