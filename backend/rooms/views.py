from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Room, RoomMembership
from .serializers import RoomSerializer, RoomMembershipSerializer
from rest_framework.decorators import action


# For Swagger doc
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    http_method_names = ['get', 'post', 'delete']

    @swagger_auto_schema(
        operation_description="Retrieve all rooms.",
        responses={200: RoomSerializer(many=True)},
        security=[{'Bearer': []}]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_description="Create a new room.",
        request_body=RoomSerializer,
        responses={
            201: RoomSerializer,
            400: "Bad Request"
        },
        security=[{'Bearer': []}]
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
    
    @swagger_auto_schema(
        method='post',
        operation_description="Join a room by its 4-digit code.",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'code': openapi.Schema(type=openapi.TYPE_INTEGER, description='4-digit room code')
            },
            required=['code'],
        ),
        responses={
            200: openapi.Response("Successfully joined."),
            400: "Bad Request (e.g., already in a room).",
            404: "Room not found for the given code."
        },
        security=[{'Bearer': []}]
    )
    @action(
        detail=False,               # no {id} in the URL (it's not `rooms/<id>/join`)
        methods=['post'],           # a POST action
        permission_classes=[permissions.IsAuthenticated],
        url_path='join'             # final path: /rooms/join/
    )
    def join_by_code(self, request):
        """
        Custom action to join a room by code.
        POST /rooms/join/ { "code": 1234 }
        """
        code = request.data.get('code')
        if not code:
            return Response(
                {"detail": "No code provided."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Convert code to integer, then fetch room
        try:
            code_int = int(code)
            room = Room.objects.get(code=code_int)
        except ValueError:
            return Response(
                {"detail": "Code must be an integer."},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Room.DoesNotExist:
            return Response(
                {"detail": "Room not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user is already in some room
        if RoomMembership.objects.filter(user=request.user).exists():
            return Response(
                {"detail": "User is already in a room."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Otherwise create membership
        RoomMembership.objects.create(user=request.user, room=room)
        return Response(
            {"detail": f"Joined room {room.name} (code {room.code}).", "id": room.id},
            status=status.HTTP_200_OK
        )
    
    @swagger_auto_schema(
        method='get',
        operation_description="Retrieve a room by its 4-digit code.",
        manual_parameters=[
            openapi.Parameter(
                'code',
                openapi.IN_QUERY,
                description="4-digit code of the room",
                required=True,
                type=openapi.TYPE_INTEGER
            )
        ],
        responses={
            200: RoomSerializer,
            404: "Room not found"
        },
        security=[{'Bearer': []}]
    )
    @action(
        detail=False,
        methods=['get'],
        permission_classes=[permissions.AllowAny],  # or IsAuthenticatedOrReadOnly
        url_path='by-code'
    )
    def retrieve_by_code(self, request):
        """
        GET /rooms/by-code?code=1234
        Returns the room data for the given 4-digit code.
        """
        code_str = request.query_params.get('code')
        if not code_str:
            return Response({"detail": "No code provided."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            code_int = int(code_str)
            room = Room.objects.get(code=code_int)
        except ValueError:
            return Response({"detail": "Code must be an integer."}, status=status.HTTP_400_BAD_REQUEST)
        except Room.DoesNotExist:
            return Response({"detail": "Room not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(room)
        return Response(serializer.data, status=status.HTTP_200_OK)

class RoomMembershipViewSet(viewsets.ModelViewSet):
    queryset = RoomMembership.objects.all()
    serializer_class = RoomMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'delete']

    @swagger_auto_schema(
        operation_description="List memberships.",
        responses={200: RoomMembershipSerializer(many=True)},
        security=[{'Bearer': []}]  # require Bearer
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_description="Create a new membership.",
        request_body=RoomMembershipSerializer,
        responses={201: RoomMembershipSerializer, 400: "Bad Request"},
        security=[{'Bearer': []}]
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)